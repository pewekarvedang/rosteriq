from __future__ import annotations
import calendar
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.database import SessionLocal
from app.models.roster import Roster, RosterStatus
from app.models.roster_assignment import RosterAssignment
from app.models.roster_assignment_process import RosterAssignmentProcess
from app.models.scheduling_conflict import SchedulingConflict, ConflictSeverity
from app.models.brand import Brand
from app.models.process import Process
from app.models.pod import Pod
from app.models.shift import Shift

from app.services.availability import load_employee_schedule_profiles, EmployeeScheduleProfile
from app.services.coverage import load_brand_process_specs, evaluate_monthly_coverage_demands
from app.services.optimization import OptimizationConfig
from app.services.scheduler import WorkforceScheduler, ScheduleSolution


def generate_monthly_roster(
    month: int,
    year: int,
    preserve_locked_assignments: bool = True,
    db: Optional[Session] = None,
    timeout_seconds: float = 30.0,
    roster_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Industrial-strength monthly workforce roster generation engine using Google OR-Tools CP-SAT.
    Satisfies Tasks 1-9: deterministic constraint optimization, lexicographic priorities,
    distinct-employee coverage guarantees, and comprehensive stakeholder reporting.
    """
    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True

    try:
        # 1. Date Range Setup
        _, last_day = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, last_day)

        dates: List[date] = []
        curr = start_date
        while curr <= end_date:
            dates.append(curr)
            curr += timedelta(days=1)

        # 2. Retrieve Reference Entities
        shifts = list(db.scalars(select(Shift).where(Shift.is_active == True).order_by(Shift.id.asc())).all())
        if not shifts:
            # Fallback default shift
            default_shift = Shift(
                name="General Shift",
                code="GENERAL",
                start_time=datetime.strptime("09:00", "%H:%M").time(),
                end_time=datetime.strptime("17:00", "%H:%M").time(),
                duration_hours=8.0,
                is_active=True
            )
            db.add(default_shift)
            db.commit()
            shifts = [default_shift]

        brands = list(db.scalars(select(Brand).where(Brand.is_active == True)).all())
        processes = list(db.scalars(select(Process).where(Process.is_active == True)).all())
        pods = list(db.scalars(select(Pod).where(Pod.is_active == True)).all())

        brand_map = {b.id: b for b in brands}
        proc_map = {p.id: p for p in processes}
        pod_map = {pod.id: pod for pod in pods}

        # 3. Retrieve Brand Processes and Staffing Requirements
        bp_specs = load_brand_process_specs(db)
        active_bp_pairs = list(bp_specs.keys())

        # 4. Evaluate Demands across Operating Calendars & Holidays
        demands = evaluate_monthly_coverage_demands(
            db=db,
            start_date=start_date,
            end_date=end_date,
            shifts=shifts,
            specs=bp_specs
        )

        # 5. Retrieve Active Employees, Workload Limits & Availability
        employee_profiles = load_employee_schedule_profiles(
            db=db,
            start_date=start_date,
            end_date=end_date,
            active_brand_processes=active_bp_pairs
        )
        emp_list = list(employee_profiles.values())

        # 6. Retrieve or Create Target Roster
        target_roster = None
        if roster_id:
            target_roster = db.get(Roster, roster_id)
            if target_roster and target_roster.status == RosterStatus.PUBLISHED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot regenerate an already published roster. Branch a new version instead."
                )

        if not target_roster:
            # Check existing roster for month/year to determine version
            max_ver = db.scalar(
                select(func.max(Roster.version)).where(
                    Roster.month == month,
                    Roster.year == year
                )
            )
            version = (max_ver or 0) + 1
            target_roster = Roster(
                name=f"Roster - {calendar.month_name[month]} {year} (v{version})",
                month=month,
                year=year,
                start_date=start_date,
                end_date=end_date,
                status=RosterStatus.DRAFT,
                version=version,
                created_by="OR-Tools Optimization Engine"
            )
            db.add(target_roster)
            db.commit()
            db.refresh(target_roster)

        # 7. Retrieve Manually Locked Assignments to Preserve
        locked_assignments: Dict[Tuple[int, date], RosterAssignment] = {}
        if preserve_locked_assignments and target_roster.id:
            existing_locked = list(db.scalars(
                select(RosterAssignment).where(
                    RosterAssignment.roster_id == target_roster.id,
                    RosterAssignment.is_locked == True
                )
            ).all())
            for la in existing_locked:
                locked_assignments[(la.employee_id, la.date)] = la

        # 8. Configure Optimization Engine
        config = OptimizationConfig(
            solver_timeout_seconds=timeout_seconds,
            num_search_workers=4
        )

        # 9. Build and Execute CP-SAT Solver
        scheduler = WorkforceScheduler(
            dates=dates,
            employees=emp_list,
            shifts=shifts,
            demands=demands,
            config=config,
            locked_assignments=locked_assignments if preserve_locked_assignments else None
        )
        solution: ScheduleSolution = scheduler.solve()

        # 10. Persist Solution to Database
        if solution.is_feasible:
            # Clear old non-locked assignments
            db.query(RosterAssignment).filter(
                RosterAssignment.roster_id == target_roster.id,
                RosterAssignment.is_locked == False
            ).delete()

            # Clear old conflicts
            db.query(SchedulingConflict).filter(
                SchedulingConflict.roster_id == target_roster.id
            ).delete()
            db.commit()

            # Persist newly generated assignments
            for a in solution.assignments:
                # If assignment is locked and already in DB, skip insert
                if preserve_locked_assignments and (a.employee_id, a.date) in locked_assignments:
                    continue

                ra = RosterAssignment(
                    roster_id=target_roster.id,
                    employee_id=a.employee_id,
                    date=a.date,
                    shift_id=a.shift_id,
                    is_off=a.is_off,
                    off_reason=a.off_reason,
                    is_locked=a.is_locked,
                    is_manual_override=False
                )
                db.add(ra)
                db.flush()

                for p_item in a.processes:
                    rap = RosterAssignmentProcess(
                        roster_assignment_id=ra.id,
                        brand_id=p_item["brand_id"],
                        process_id=p_item["process_id"],
                        allocated_hours=p_item["allocated_hours"],
                        is_primary=p_item["is_primary"]
                    )
                    db.add(rap)

            # Persist explicit shortage conflicts
            for short in solution.shortages:
                b_name = brand_map[short.brand_id].name if short.brand_id in brand_map else f"Brand {short.brand_id}"
                p_name = proc_map[short.process_id].name if short.process_id in proc_map else f"Process {short.process_id}"

                conflict = SchedulingConflict(
                    roster_id=target_roster.id,
                    conflict_type="COVERAGE_GAP",
                    severity=ConflictSeverity.CRITICAL,
                    date=short.date,
                    brand_id=short.brand_id,
                    process_id=short.process_id,
                    description=(
                        f"Unstaffed slot for '{b_name}' - '{p_name}' on {short.date} "
                        f"(Assigned: {short.assigned_headcount}/{short.required_headcount}, Missing: {short.missing_headcount})"
                    ),
                    resolution_suggestion=(
                        f"Assign an available team member cross-trained on {p_name} or arrange backup support."
                    ),
                    is_resolved=False
                )
                db.add(conflict)

            # Keep roster as DRAFT (Never report an understaffed roster as fully valid)
            target_roster.status = RosterStatus.DRAFT
            db.commit()
            db.refresh(target_roster)

        # 11. Format Structured Output (Task 9)
        output = _format_structured_roster_output(
            target_roster=target_roster,
            solution=solution,
            dates=dates,
            employee_profiles=employee_profiles,
            shifts=shifts,
            brand_map=brand_map,
            proc_map=proc_map,
            pod_map=pod_map
        )

        return output

    finally:
        if should_close_db:
            db.close()


def _format_structured_roster_output(
    target_roster: Roster,
    solution: ScheduleSolution,
    dates: List[date],
    employee_profiles: Dict[int, EmployeeScheduleProfile],
    shifts: List[Shift],
    brand_map: Dict[int, Brand],
    proc_map: Dict[int, Process],
    pod_map: Dict[int, Pod]
) -> Dict[str, Any]:
    """Generates comprehensive stakeholder views and optimization reports."""
    shift_map = {s.id: s for s in shifts}

    # 1. Employee-wise schedules
    emp_schedules: Dict[int, Dict[str, Any]] = {}
    for emp_id, prof in employee_profiles.items():
        pod_name = pod_map[prof.pod_id].name if prof.pod_id and prof.pod_id in pod_map else "Unassigned"
        emp_schedules[emp_id] = {
            "employee_id": emp_id,
            "employee_code": prof.employee_code,
            "full_name": prof.full_name,
            "pod_id": prof.pod_id,
            "pod_name": pod_name,
            "total_working_days": 0,
            "total_hours": 0.0,
            "total_weekly_offs": 0,
            "total_leaves": 0,
            "days": {}
        }

    for a in solution.assignments:
        if a.employee_id in emp_schedules:
            emp_data = emp_schedules[a.employee_id]
            date_str = a.date.isoformat()

            if a.is_off:
                if a.off_reason and "LEAVE" in a.off_reason:
                    emp_data["total_leaves"] += 1
                else:
                    emp_data["total_weekly_offs"] += 1

                emp_data["days"][date_str] = {
                    "is_working": False,
                    "status": a.off_reason or "OFF",
                    "shift": None,
                    "processes": []
                }
            else:
                shift_obj = shift_map.get(a.shift_id)
                shift_hours = shift_obj.duration_hours if shift_obj else 8.0
                emp_data["total_working_days"] += 1
                emp_data["total_hours"] += shift_hours

                procs_list = []
                for p in a.processes:
                    b_name = brand_map[p["brand_id"]].name if p["brand_id"] in brand_map else f"Brand {p['brand_id']}"
                    pr_name = proc_map[p["process_id"]].name if p["process_id"] in proc_map else f"Proc {p['process_id']}"
                    procs_list.append({
                        "brand_id": p["brand_id"],
                        "brand_name": b_name,
                        "process_id": p["process_id"],
                        "process_name": pr_name,
                        "allocated_hours": p["allocated_hours"]
                    })

                emp_data["days"][date_str] = {
                    "is_working": True,
                    "status": "WORKING",
                    "shift": shift_obj.name if shift_obj else "General Shift",
                    "shift_code": shift_obj.code if shift_obj else "GENERAL",
                    "processes": procs_list
                }

    # 2. Brand-wise Schedules
    brand_schedules: Dict[int, Dict[str, Any]] = {}
    for b_id, b in brand_map.items():
        brand_schedules[b_id] = {
            "brand_id": b_id,
            "brand_name": b.name,
            "brand_code": b.code,
            "daily_coverage": {}
        }

    for a in solution.assignments:
        if not a.is_off and a.processes:
            for p in a.processes:
                b_id = p["brand_id"]
                if b_id in brand_schedules:
                    d_str = a.date.isoformat()
                    emp_name = employee_profiles[a.employee_id].full_name if a.employee_id in employee_profiles else str(a.employee_id)
                    pr_name = proc_map[p["process_id"]].name if p["process_id"] in proc_map else str(p["process_id"])

                    if d_str not in brand_schedules[b_id]["daily_coverage"]:
                        brand_schedules[b_id]["daily_coverage"][d_str] = []

                    brand_schedules[b_id]["daily_coverage"][d_str].append({
                        "employee_id": a.employee_id,
                        "employee_name": emp_name,
                        "process_id": p["process_id"],
                        "process_name": pr_name,
                        "allocated_hours": p["allocated_hours"]
                    })

    # 3. Process-wise Coverage
    proc_coverage: Dict[int, Dict[str, Any]] = {}
    for p_id, p in proc_map.items():
        proc_coverage[p_id] = {
            "process_id": p_id,
            "process_name": p.name,
            "process_code": p.code,
            "total_slots_covered": 0,
            "total_slots_uncovered": 0
        }

    for a in solution.assignments:
        if not a.is_off and a.processes:
            for p in a.processes:
                p_id = p["process_id"]
                if p_id in proc_coverage:
                    proc_coverage[p_id]["total_slots_covered"] += 1

    for sh in solution.shortages:
        if sh.process_id in proc_coverage:
            proc_coverage[sh.process_id]["total_slots_uncovered"] += sh.missing_headcount

    # 4. Pod-wise Schedules
    pod_schedules: Dict[int, Dict[str, Any]] = {}
    for pod_id, pod in pod_map.items():
        pod_schedules[pod_id] = {
            "pod_id": pod_id,
            "pod_name": pod.name,
            "pod_code": pod.code,
            "members": [emp for emp in emp_schedules.values() if emp["pod_id"] == pod_id]
        }

    return {
        "roster_id": target_roster.id,
        "name": target_roster.name,
        "month": target_roster.month,
        "year": target_roster.year,
        "generation_status": solution.status,
        "is_feasible": solution.is_feasible,
        "is_fully_covered": solution.is_fully_covered,
        "total_employees": len(employee_profiles),
        "total_required_staffing_slots": solution.total_demand_slots,
        "total_assigned_staffing_slots": solution.total_assigned_slots,
        "coverage_percentage": solution.coverage_percentage,
        "total_shortage_count": solution.total_shortages,
        "shortage_details": [
            {
                "brand_id": s.brand_id,
                "brand_name": brand_map[s.brand_id].name if s.brand_id in brand_map else str(s.brand_id),
                "process_id": s.process_id,
                "process_name": proc_map[s.process_id].name if s.process_id in proc_map else str(s.process_id),
                "date": s.date.isoformat(),
                "shift_id": s.shift_id,
                "required_headcount": s.required_headcount,
                "assigned_headcount": s.assigned_headcount,
                "missing_headcount": s.missing_headcount
            }
            for s in solution.shortages
        ],
        "employee_wise_schedules": emp_schedules,
        "brand_wise_schedules": brand_schedules,
        "process_wise_coverage": proc_coverage,
        "pod_wise_schedules": pod_schedules,
        "solver_status": solution.solver_stats.solver_status,
        "optimization_statistics": {
            "wall_time_seconds": solution.solver_stats.wall_time_seconds,
            "num_branches": solution.solver_stats.num_branches,
            "num_conflicts": solution.solver_stats.num_conflicts,
            "objective_value": solution.solver_stats.objective_value,
            "status_message": solution.solver_stats.status_message,
            "diagnostic_message": solution.diagnostic_message
        }
    }
