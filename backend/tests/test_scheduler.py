from datetime import date, time
import pytest
from sqlalchemy import select

from app.models.employee import Employee
from app.models.pod import Pod
from app.models.brand import Brand
from app.models.process import Process
from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.models.employee_assignment import EmployeeAssignment
from app.models.employee_availability import EmployeeAvailability, AvailabilityType, ApprovalStatus
from app.models.shift import Shift
from app.models.roster import Roster
from app.models.roster_assignment import RosterAssignment
from app.services.roster_generator import generate_monthly_roster
from app.services.coverage import evaluate_monthly_coverage_demands, load_brand_process_specs


def _setup_base_environment(db):
    """Helper to initialize standard shifts and a pod."""
    shifts = list(db.scalars(select(Shift)).all())
    if not shifts:
        s_gen = Shift(name="General Shift", code="GENERAL", start_time=time(9, 0), end_time=time(17, 0), duration_hours=8.0)
        s_morn = Shift(name="Morning Shift", code="MORNING", start_time=time(6, 0), end_time=time(14, 0), duration_hours=8.0)
        s_night = Shift(name="Night Shift", code="NIGHT", start_time=time(22, 0), end_time=time(6, 0), duration_hours=8.0, is_overnight=True)
        db.add_all([s_gen, s_morn, s_night])
        db.commit()

    pod = db.scalar(select(Pod).limit(1))
    if not pod:
        pod = Pod(name="Test Pod", code="POD-TEST")
        db.add(pod)
        db.commit()
        db.refresh(pod)
    return pod


def test_1_normal_month_sufficient_staffing(db_session):
    """
    TEST 1: Normal month with sufficient staffing.
    Expected: Fully covered roster (100% coverage, 0 shortages).
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T1 Brand", code="T1-B")
    proc = Process(name="T1 CS", code="T1-CS")
    db_session.add_all([brand, proc])
    db_session.flush()

    # Mon-Fri schedule
    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.CUSTOM,
        custom_operating_days="0,1,2,3,4",
        min_headcount_per_shift=1
    )
    db_session.add(bp)

    emp1 = Employee(employee_code="T1-E1", full_name="Worker 1", email="w1@test.io", pod_id=pod.id)
    emp2 = Employee(employee_code="T1-E2", full_name="Worker 2", email="w2@test.io", pod_id=pod.id)
    emp3 = Employee(employee_code="T1-E3", full_name="Worker 3", email="w3@test.io", pod_id=pod.id)
    db_session.add_all([emp1, emp2, emp3])
    db_session.flush()

    for emp in [emp1, emp2, emp3]:
        ea = EmployeeAssignment(
            employee_id=emp.id,
            brand_id=brand.id,
            process_id=proc.id,
            start_date=date(2026, 11, 1),
            is_active=True
        )
        db_session.add(ea)
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)

    assert result["is_feasible"] is True
    assert result["is_fully_covered"] is True
    assert result["total_shortage_count"] == 0
    assert result["coverage_percentage"] == 100.0


def test_2_employee_approved_leave(db_session):
    """
    TEST 2: Employee has approved leave.
    Expected: Employee receives no assignment on leave dates.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T2 Brand", code="T2-B")
    proc = Process(name="T2 Process", code="T2-P")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.EVERYDAY,
        min_headcount_per_shift=1
    )
    db_session.add(bp)

    emp_leave = Employee(employee_code="T2-LEAVE", full_name="Leave Emp", email="leave@test.io", pod_id=pod.id)
    emp_peer = Employee(employee_code="T2-PEER", full_name="Peer Emp", email="peer@test.io", pod_id=pod.id)
    db_session.add_all([emp_leave, emp_peer])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp_leave.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp_peer.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])

    leave_date = date(2026, 11, 10)
    db_session.add(EmployeeAvailability(
        employee_id=emp_leave.id,
        date=leave_date,
        availability_type=AvailabilityType.LEAVE,
        leave_type="PLANNED_LEAVE",
        status=ApprovalStatus.APPROVED
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)

    emp_schedule = result["employee_wise_schedules"][emp_leave.id]
    day_status = emp_schedule["days"][leave_date.isoformat()]
    assert day_status["is_working"] is False
    assert "LEAVE" in day_status["status"]


def test_3_single_resource_brand_unavailable(db_session):
    """
    TEST 3: Single-resource brand employee is unavailable.
    Expected: Coverage shortage detected (never reported as fully valid).
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T3 Solo Brand", code="T3-SOLO")
    proc = Process(name="T3 CS", code="T3-CS")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    solo_emp = Employee(employee_code="T3-SOLO-EMP", full_name="Solo Hero", email="solohero@test.io", pod_id=pod.id)
    db_session.add(solo_emp)
    db_session.flush()

    db_session.add(EmployeeAssignment(employee_id=solo_emp.id, brand_id=brand.id, process_id=None, start_date=date(2026, 11, 1)))

    unavail_date = date(2026, 11, 15)
    db_session.add(EmployeeAvailability(
        employee_id=solo_emp.id,
        date=unavail_date,
        availability_type=AvailabilityType.LEAVE,
        status=ApprovalStatus.APPROVED
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)

    assert result["is_fully_covered"] is False
    assert result["total_shortage_count"] >= 1
    shortage_dates = [s["date"] for s in result["shortage_details"] if s["brand_id"] == brand.id]
    assert unavail_date.isoformat() in shortage_dates


def test_4_multi_resource_brand_unavailable(db_session):
    """
    TEST 4: Multi-resource brand employee is unavailable.
    Expected: Remaining eligible employees are evaluated and cover the shift.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T4 Multi Brand", code="T4-MULTI")
    proc = Process(name="T4 CS", code="T4-CS")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    emp_a = Employee(employee_code="T4-A", full_name="Agent A", email="agenta@test.io", pod_id=pod.id)
    emp_b = Employee(employee_code="T4-B", full_name="Agent B", email="agentb@test.io", pod_id=pod.id)
    db_session.add_all([emp_a, emp_b])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp_a.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp_b.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])

    leave_date = date(2026, 11, 12)
    db_session.add(EmployeeAvailability(
        employee_id=emp_a.id,
        date=leave_date,
        availability_type=AvailabilityType.LEAVE,
        status=ApprovalStatus.APPROVED
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)

    brand_sched = result["brand_wise_schedules"][brand.id]
    coverage_nov12 = brand_sched["daily_coverage"].get(leave_date.isoformat(), [])
    assert len(coverage_nov12) >= 1
    assigned_ids = [c["employee_id"] for c in coverage_nov12]
    assert emp_b.id in assigned_ids
    assert emp_a.id not in assigned_ids


def test_5_process_does_not_operate_on_sundays(db_session):
    """
    TEST 5: Process does not operate on Sundays.
    Expected: No Sunday staffing requirement.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T5 Brand", code="T5-B")
    proc = Process(name="T5 ClosedSun", code="T5-CSUN")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS,
        min_headcount_per_shift=1
    )
    db_session.add(bp)
    db_session.commit()

    shifts = list(db_session.scalars(select(Shift)).all())
    specs = load_brand_process_specs(db_session)
    demands = evaluate_monthly_coverage_demands(
        db=db_session,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 30),
        shifts=shifts,
        specs=specs
    )

    t5_sunday_demands = [
        d for d in demands
        if d.brand_id == brand.id and d.process_id == proc.id and d.date.weekday() == 6
    ]
    assert len(t5_sunday_demands) == 0


def test_6_process_operates_every_day(db_session):
    """
    TEST 6: Process operates every day.
    Expected: Sunday staffing requirement exists.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T6 Brand", code="T6-B")
    proc = Process(name="T6 365", code="T6-365")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.EVERYDAY,
        min_headcount_per_shift=1
    )
    db_session.add(bp)
    db_session.commit()

    shifts = list(db_session.scalars(select(Shift)).all())
    specs = load_brand_process_specs(db_session)
    demands = evaluate_monthly_coverage_demands(
        db=db_session,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 30),
        shifts=shifts,
        specs=specs
    )

    t6_sunday_demands = [
        d for d in demands
        if d.brand_id == brand.id and d.process_id == proc.id and d.date.weekday() == 6
    ]
    assert len(t6_sunday_demands) == 5
    for sd in t6_sunday_demands:
        assert sd.required_headcount == 1


def test_7_overlapping_shift_prevention_and_infeasibility(db_session):
    """
    TEST 7: Two incompatible shifts overlap.
    Expected: Assignment prevented or infeasibility reported with diagnostic info.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T7 Brand", code="T7-B")
    proc = Process(name="T7 Proc", code="T7-P")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    emp = Employee(employee_code="T7-EMP", full_name="Overlap Tester", email="overlap@test.io", pod_id=pod.id)
    db_session.add(emp)
    db_session.flush()

    db_session.add(EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)))

    roster = Roster(name="Infeasible Test Roster", month=11, year=2026, start_date=date(2026, 11, 1), end_date=date(2026, 11, 30))
    db_session.add(roster)
    db_session.flush()

    s_gen = db_session.scalar(select(Shift).where(Shift.code == "GENERAL"))
    la = RosterAssignment(
        roster_id=roster.id,
        employee_id=emp.id,
        date=date(2026, 11, 5),
        shift_id=s_gen.id,
        is_locked=True
    )
    db_session.add(la)

    db_session.add(EmployeeAvailability(
        employee_id=emp.id,
        date=date(2026, 11, 5),
        availability_type=AvailabilityType.LEAVE,
        status=ApprovalStatus.APPROVED
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, preserve_locked_assignments=True, db=db_session, timeout_seconds=3.0, roster_id=roster.id)

    assert result["generation_status"] == "INFEASIBLE"
    assert result["is_feasible"] is False
    assert "conflicts with approved leave" in result["optimization_statistics"]["diagnostic_message"]


def test_8_insufficient_employees_best_effort_draft(db_session):
    """
    TEST 8: Insufficient employees exist.
    Expected: Best-effort draft with explicit shortages.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T8 Big Brand", code="T8-BIG")
    proc = Process(name="T8 High Volume", code="T8-HV")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=5)
    db_session.add(bp)

    emp = Employee(employee_code="T8-SOLO", full_name="Only One", email="onlyone@test.io", pod_id=pod.id)
    db_session.add(emp)
    db_session.flush()

    db_session.add(EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)

    assert result["is_feasible"] is True
    assert result["is_fully_covered"] is False
    assert result["total_shortage_count"] > 0
    assert len(result["shortage_details"]) > 0


def test_9_manually_locked_assignment_preserved(db_session):
    """
    TEST 9: An assignment is manually locked.
    Expected: Regeneration preserves that assignment.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T9 Brand", code="T9-B")
    proc = Process(name="T9 Proc", code="T9-P")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4")
    db_session.add(bp)

    emp1 = Employee(employee_code="T9-E1", full_name="Lock E1", email="locke1@test.io", pod_id=pod.id)
    emp2 = Employee(employee_code="T9-E2", full_name="Lock E2", email="locke2@test.io", pod_id=pod.id)
    db_session.add_all([emp1, emp2])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp1.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp2.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])

    roster = Roster(name="Lock Test Roster", month=11, year=2026, start_date=date(2026, 11, 1), end_date=date(2026, 11, 30))
    db_session.add(roster)
    db_session.flush()

    lock_date = date(2026, 11, 2)
    la = RosterAssignment(
        roster_id=roster.id,
        employee_id=emp1.id,
        date=lock_date,
        shift_id=None,
        is_off=True,
        off_reason="MANUALLY_LOCKED_OFF",
        is_locked=True
    )
    db_session.add(la)
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, preserve_locked_assignments=True, db=db_session, timeout_seconds=3.0, roster_id=roster.id)

    emp1_sched = result["employee_wise_schedules"][emp1.id]
    day_res = emp1_sched["days"][lock_date.isoformat()]
    assert day_res["is_working"] is False
    assert day_res["status"] == "MANUALLY_LOCKED_OFF"


def test_10_multiple_processes_capacity_and_distinct_person_coverage(db_session):
    """
    TEST 10: An employee has multiple process assignments.
    Expected: Workload capacity and distinct-person coverage are calculated correctly.
    """
    pod = _setup_base_environment(db_session)
    brand = Brand(name="T10 Multi-Proc Brand", code="T10-MPB")
    proc1 = Process(name="T10 Support", code="T10-CS")
    proc2 = Process(name="T10 Recovery", code="T10-ACC")
    db_session.add_all([brand, proc1, proc2])
    db_session.flush()

    bp1 = BrandProcess(brand_id=brand.id, process_id=proc1.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4", min_headcount_per_shift=1)
    bp2 = BrandProcess(brand_id=brand.id, process_id=proc2.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4", min_headcount_per_shift=1)
    db_session.add_all([bp1, bp2])

    emp = Employee(employee_code="T10-SUPER", full_name="Super Agent", email="super@test.io", pod_id=pod.id, max_daily_hours=8.0)
    db_session.add(emp)
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc1.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc2.id, start_date=date(2026, 11, 1)),
    ])
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)

    emp_sched = result["employee_wise_schedules"][emp.id]
    working_days = [d for d, s in emp_sched["days"].items() if s["is_working"]]
    assert len(working_days) > 0

    first_day = emp_sched["days"][working_days[0]]
    proc_codes = [p["process_name"] for p in first_day["processes"]]
    assert "T10 Support" in proc_codes
    assert "T10 Recovery" in proc_codes

    total_hours = sum(p["allocated_hours"] for p in first_day["processes"])
    assert total_hours <= 8.0
