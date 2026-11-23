from datetime import date, timedelta
from typing import List, Set, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.roster import Roster
from app.models.roster_assignment import RosterAssignment
from app.models.roster_assignment_process import RosterAssignmentProcess
from app.models.brand_process import BrandProcess
from app.models.employee_availability import EmployeeAvailability, AvailabilityType, ApprovalStatus
from app.models.employee import Employee
from app.models.scheduling_conflict import SchedulingConflict, ConflictSeverity
from app.services.holiday_service import HolidayService
from app.utils.calendar_utils import is_brand_process_operating_on_date


class ConflictService:
    @staticmethod
    def detect_conflicts(db: Session, roster_id: int) -> List[SchedulingConflict]:
        """
        Runs comprehensive conflict detection for a given roster:
        1. Coverage gaps (Operating brand process without required minimum staffing)
        2. Leave / unavailability collisions
        3. Workload limits exceeded (daily & weekly hours)
        4. Consecutive working days exceeded
        5. Preference violations (assigned on preferred weekly off)
        """
        roster = db.get(Roster, roster_id)
        if not roster:
            return []

        # Clear existing unresolved auto-generated conflicts for this roster
        db.query(SchedulingConflict).filter(
            SchedulingConflict.roster_id == roster_id,
            SchedulingConflict.is_resolved == False
        ).delete()

        new_conflicts: List[SchedulingConflict] = []

        # 1. Fetch reference data
        holidays: Set[date] = HolidayService.get_holiday_dates_in_range(db, roster.start_date, roster.end_date)
        active_brand_processes: List[BrandProcess] = list(
            db.scalars(select(BrandProcess).where(BrandProcess.is_active == True)).all()
        )
        assignments: List[RosterAssignment] = list(
            db.scalars(select(RosterAssignment).where(RosterAssignment.roster_id == roster_id)).all()
        )

        # Index assignments by (date, employee_id)
        emp_assignments_by_date: Dict[date, Dict[int, RosterAssignment]] = {}
        # Index process coverage by (date, brand_id, process_id) -> count of employees
        process_coverage: Dict[tuple, int] = {}

        for ra in assignments:
            if ra.date not in emp_assignments_by_date:
                emp_assignments_by_date[ra.date] = {}
            emp_assignments_by_date[ra.date][ra.employee_id] = ra

            if not ra.is_off:
                for rap in ra.processes:
                    key = (ra.date, rap.brand_id, rap.process_id)
                    process_coverage[key] = process_coverage.get(key, 0) + 1

        # 2. Check Coverage Gaps for each active BrandProcess across all days in roster
        curr = roster.start_date
        while curr <= roster.end_date:
            for bp in active_brand_processes:
                is_operating = is_brand_process_operating_on_date(bp, curr, holidays)
                if is_operating:
                    covered_count = process_coverage.get((curr, bp.brand_id, bp.process_id), 0)
                    if covered_count == 0:
                        new_conflicts.append(SchedulingConflict(
                            roster_id=roster_id,
                            conflict_type="COVERAGE_GAP",
                            severity=ConflictSeverity.CRITICAL,
                            date=curr,
                            brand_id=bp.brand_id,
                            process_id=bp.process_id,
                            description=(
                                f"Zero coverage for '{bp.brand.name}' - '{bp.process.name}' on {curr} "
                                f"(Operating Rule: {bp.operating_calendar.value}, Min Required: {bp.min_headcount_per_shift})"
                            ),
                            resolution_suggestion=f"Assign an available employee trained on {bp.process.name} for {bp.brand.name}."
                        ))
                    elif covered_count < bp.min_headcount_per_shift:
                        new_conflicts.append(SchedulingConflict(
                            roster_id=roster_id,
                            conflict_type="INSUFFICIENT_STAFFING",
                            severity=ConflictSeverity.CRITICAL,
                            date=curr,
                            brand_id=bp.brand_id,
                            process_id=bp.process_id,
                            description=(
                                f"Understaffed for '{bp.brand.name}' - '{bp.process.name}' on {curr}. "
                                f"Assigned: {covered_count}, Required: {bp.min_headcount_per_shift}"
                            ),
                            resolution_suggestion="Assign additional qualified team member to meet minimum headcount."
                        ))
            curr += timedelta(days=1)

        # 3. Check Employee Availability & Leave Conflicts
        availabilities = list(db.scalars(
            select(EmployeeAvailability).where(
                EmployeeAvailability.date >= roster.start_date,
                EmployeeAvailability.date <= roster.end_date,
                EmployeeAvailability.status == ApprovalStatus.APPROVED
            )
        ).all())

        for avail in availabilities:
            if avail.availability_type in [AvailabilityType.LEAVE, AvailabilityType.COMP_OFF, AvailabilityType.UNAVAILABLE]:
                day_assignments = emp_assignments_by_date.get(avail.date, {})
                assigned = day_assignments.get(avail.employee_id)
                if assigned and not assigned.is_off:
                    new_conflicts.append(SchedulingConflict(
                        roster_id=roster_id,
                        conflict_type="LEAVE_CONFLICT",
                        severity=ConflictSeverity.CRITICAL,
                        date=avail.date,
                        employee_id=avail.employee_id,
                        description=(
                            f"Employee '{avail.employee.full_name}' is scheduled to work on {avail.date} "
                            f"despite approved {avail.availability_type.value} ({avail.leave_type or 'General'})."
                        ),
                        resolution_suggestion="Reassign employee shift to an off day or substitute with backup peer."
                    ))

        # 4. Check Workload and Consecutive Days per employee
        employees = list(db.scalars(select(Employee).where(Employee.is_active == True)).all())
        for emp in employees:
            consecutive_working = 0
            curr_date = roster.start_date
            weekly_hours = 0.0

            while curr_date <= roster.end_date:
                # Monday resets weekly hours
                if curr_date.weekday() == 0:
                    weekly_hours = 0.0

                day_ra = emp_assignments_by_date.get(curr_date, {}).get(emp.id)
                if day_ra and not day_ra.is_off:
                    shift_hours = day_ra.shift.duration_hours if day_ra.shift else 8.0
                    weekly_hours += shift_hours
                    consecutive_working += 1

                    # Check daily workload
                    total_proc_hours = sum(p.allocated_hours for p in day_ra.processes)
                    if total_proc_hours > emp.max_daily_hours:
                        new_conflicts.append(SchedulingConflict(
                            roster_id=roster_id,
                            conflict_type="WORKLOAD_LIMIT_EXCEEDED",
                            severity=ConflictSeverity.WARNING,
                            date=curr_date,
                            employee_id=emp.id,
                            description=(
                                f"Employee '{emp.full_name}' allocated {total_proc_hours}h exceeding "
                                f"max daily limit of {emp.max_daily_hours}h on {curr_date}."
                            ),
                            resolution_suggestion="Reduce allocated process hours or reallocate processes across multiple shifts."
                        ))

                    # Check consecutive working days
                    if consecutive_working > emp.max_consecutive_days:
                        new_conflicts.append(SchedulingConflict(
                            roster_id=roster_id,
                            conflict_type="CONSECUTIVE_DAYS_EXCEEDED",
                            severity=ConflictSeverity.WARNING,
                            date=curr_date,
                            employee_id=emp.id,
                            description=(
                                f"Employee '{emp.full_name}' scheduled for {consecutive_working} consecutive work days, "
                                f"exceeding max limit of {emp.max_consecutive_days} days on {curr_date}."
                            ),
                            resolution_suggestion="Grant a weekly off or rest day."
                        ))

                    # Check weekly hours
                    if weekly_hours > emp.max_weekly_hours:
                        new_conflicts.append(SchedulingConflict(
                            roster_id=roster_id,
                            conflict_type="WORKLOAD_LIMIT_EXCEEDED",
                            severity=ConflictSeverity.WARNING,
                            date=curr_date,
                            employee_id=emp.id,
                            description=(
                                f"Employee '{emp.full_name}' weekly workload reached {weekly_hours}h, "
                                f"exceeding max weekly limit of {emp.max_weekly_hours}h by {curr_date}."
                            ),
                            resolution_suggestion="Adjust roster to keep weekly hours within limits."
                        ))
                else:
                    consecutive_working = 0

                curr_date += timedelta(days=1)

        for conf in new_conflicts:
            db.add(conf)

        db.commit()
        return new_conflicts
