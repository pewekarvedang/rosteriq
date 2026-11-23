from datetime import date
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.employee import Employee
from app.models.employee_assignment import EmployeeAssignment
from app.models.employee_availability import EmployeeAvailability, AvailabilityType, ApprovalStatus


@dataclass
class EmployeeScheduleProfile:
    employee_id: int
    employee_code: str
    full_name: str
    pod_id: Optional[int]
    max_weekly_hours: float
    max_daily_hours: float
    max_consecutive_days: int
    default_weekly_off_days: Set[int]
    # Set of dates where employee has approved leave / unavailability
    unavailable_dates: Set[date] = field(default_factory=set)
    unavailable_reasons: Dict[date, str] = field(default_factory=dict)
    # Map: date -> Set of (brand_id, process_id) the employee is eligible to cover
    eligible_brand_processes_by_date: Dict[date, Set[Tuple[int, int]]] = field(default_factory=dict)
    # Map: date -> Set of brand_ids where employee is dedicated (handles all processes)
    dedicated_brands_by_date: Dict[date, Set[int]] = field(default_factory=dict)


def parse_weekly_off_days(days_str: str) -> Set[int]:
    """Parses comma-separated string of weekday integers (0=Monday, 6=Sunday)."""
    if not days_str:
        return {6}  # default Sunday
    try:
        parts = str(days_str).split(",")
        return {int(p.strip()) for p in parts if p.strip().isdigit()}
    except Exception:
        return {6}


def load_employee_schedule_profiles(
    db: Session,
    start_date: date,
    end_date: date,
    active_brand_processes: List[Tuple[int, int]]
) -> Dict[int, EmployeeScheduleProfile]:
    """
    Loads active employees, their workload limits, availability restrictions (leaves/comp-offs),
    and active brand/process assignments covering the target date range.
    """
    employees = list(db.scalars(select(Employee).where(Employee.is_active == True)).all())
    assignments = list(db.scalars(
        select(EmployeeAssignment).where(
            EmployeeAssignment.is_active == True,
            EmployeeAssignment.start_date <= end_date,
            (EmployeeAssignment.end_date == None) | (EmployeeAssignment.end_date >= start_date)
        )
    ).all())
    availabilities = list(db.scalars(
        select(EmployeeAvailability).where(
            EmployeeAvailability.date >= start_date,
            EmployeeAvailability.date <= end_date,
            EmployeeAvailability.status == ApprovalStatus.APPROVED
        )
    ).all())

    # Map of all active brand processes for fast lookup: brand_id -> set of process_ids
    brand_to_all_procs: Dict[int, Set[int]] = {}
    for b_id, p_id in active_brand_processes:
        brand_to_all_procs.setdefault(b_id, set()).add(p_id)

    profiles: Dict[int, EmployeeScheduleProfile] = {}

    for emp in employees:
        pref_offs = parse_weekly_off_days(emp.default_weekly_off_days)
        profiles[emp.id] = EmployeeScheduleProfile(
            employee_id=emp.id,
            employee_code=emp.employee_code,
            full_name=emp.full_name,
            pod_id=emp.pod_id,
            max_weekly_hours=emp.max_weekly_hours or 40.0,
            max_daily_hours=emp.max_daily_hours or 8.0,
            max_consecutive_days=emp.max_consecutive_days or 6,
            default_weekly_off_days=pref_offs
        )

    # Process unavailable dates (Leaves, Comp-offs, Unavailability)
    for avail in availabilities:
        if avail.employee_id in profiles:
            if avail.availability_type in [AvailabilityType.LEAVE, AvailabilityType.COMP_OFF, AvailabilityType.UNAVAILABLE]:
                profiles[avail.employee_id].unavailable_dates.add(avail.date)
                reason_str = f"{avail.availability_type.value}: {avail.leave_type or avail.reason or 'Approved'}"
                profiles[avail.employee_id].unavailable_reasons[avail.date] = reason_str

    # Process assignments across date range
    # Generates daily eligibility mapping for each employee
    curr = start_date
    date_list = []
    from datetime import timedelta
    while curr <= end_date:
        date_list.append(curr)
        curr += timedelta(days=1)

    for ea in assignments:
        if ea.employee_id not in profiles:
            continue
        prof = profiles[ea.employee_id]

        for d in date_list:
            # Check if assignment is active on date d
            if ea.start_date <= d and (ea.end_date is None or ea.end_date >= d):
                if d not in prof.eligible_brand_processes_by_date:
                    prof.eligible_brand_processes_by_date[d] = set()
                if d not in prof.dedicated_brands_by_date:
                    prof.dedicated_brands_by_date[d] = set()

                if ea.process_id is not None:
                    # Specific process assignment
                    prof.eligible_brand_processes_by_date[d].add((ea.brand_id, ea.process_id))
                else:
                    # Dedicated single-resource assignment: covers all processes under this brand
                    prof.dedicated_brands_by_date[d].add(ea.brand_id)
                    all_p = brand_to_all_procs.get(ea.brand_id, set())
                    for p in all_p:
                        prof.eligible_brand_processes_by_date[d].add((ea.brand_id, p))

    return profiles
