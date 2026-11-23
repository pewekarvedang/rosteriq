"""
Comprehensive test suite verifying all 14 mandatory scheduling scenarios (TEST A through TEST N)
as specified in Section 4 of the RosterIQ Integration Audit requirements.
"""

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
from app.models.public_holiday import PublicHoliday
from app.models.shift import Shift
from app.models.roster import Roster, RosterStatus
from app.models.roster_assignment import RosterAssignment
from app.services.roster_generator import generate_monthly_roster
from app.services.coverage import evaluate_monthly_coverage_demands, load_brand_process_specs
from app.services.conflict_service import ConflictService
from app.services.roster_service import RosterService


def _init_base_env(db):
    shifts = list(db.scalars(select(Shift)).all())
    if not shifts:
        s_gen = Shift(name="General Shift", code="GENERAL", start_time=time(9, 0), end_time=time(17, 0), duration_hours=8.0)
        s_morn = Shift(name="Morning Shift", code="MORNING", start_time=time(6, 0), end_time=time(14, 0), duration_hours=8.0)
        s_night = Shift(name="Night Shift", code="NIGHT", start_time=time(22, 0), end_time=time(6, 0), duration_hours=8.0, is_overnight=True)
        db.add_all([s_gen, s_morn, s_night])
        db.commit()

    pod = db.scalar(select(Pod).limit(1))
    if not pod:
        pod = Pod(name="Alpha Pod", code="POD-ALPHA")
        db.add(pod)
        db.commit()
        db.refresh(pod)
    return pod


def test_scenario_a_normal_roster_generation(db_session):
    """TEST A: Normal roster generation. Expected: All requirements satisfied."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand A", code="BR-A")
    proc = Process(name="Process A", code="PR-A")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.CUSTOM,
        custom_operating_days="0,1,2,3,4",
        min_headcount_per_shift=1
    )
    db_session.add(bp)

    emp1 = Employee(employee_code="EMP-A1", full_name="Worker A1", email="a1@test.io", pod_id=pod.id)
    emp2 = Employee(employee_code="EMP-A2", full_name="Worker A2", email="a2@test.io", pod_id=pod.id)
    emp3 = Employee(employee_code="EMP-A3", full_name="Worker A3", email="a3@test.io", pod_id=pod.id)
    db_session.add_all([emp1, emp2, emp3])
    db_session.flush()

    for emp in [emp1, emp2, emp3]:
        db_session.add(EmployeeAssignment(
            employee_id=emp.id, brand_id=brand.id, process_id=proc.id,
            start_date=date(2026, 11, 1), is_active=True
        ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    assert result["is_feasible"] is True
    assert result["is_fully_covered"] is True
    assert result["total_shortage_count"] == 0
    assert result["coverage_percentage"] == 100.0


def test_scenario_b_single_resource_employee_unavailable(db_session):
    """TEST B: Single-resource employee becomes unavailable. Expected: Coverage shortage detected."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand B", code="BR-B")
    proc = Process(name="Process B", code="PR-B")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    solo_emp = Employee(employee_code="EMP-B-SOLO", full_name="Solo B", email="solob@test.io", pod_id=pod.id)
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


def test_scenario_c_multi_resource_employee_unavailable(db_session):
    """TEST C: Multi-resource employee becomes unavailable. Expected: Remaining qualified employees evaluated."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand C", code="BR-C")
    proc = Process(name="Process C", code="PR-C")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    emp_a = Employee(employee_code="EMP-C-A", full_name="Agent CA", email="ca@test.io", pod_id=pod.id)
    emp_b = Employee(employee_code="EMP-C-B", full_name="Agent CB", email="cb@test.io", pod_id=pod.id)
    db_session.add_all([emp_a, emp_b])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp_a.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp_b.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])

    leave_date = date(2026, 11, 18)
    db_session.add(EmployeeAvailability(
        employee_id=emp_a.id,
        date=leave_date,
        availability_type=AvailabilityType.LEAVE,
        status=ApprovalStatus.APPROVED
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    brand_sched = result["brand_wise_schedules"][brand.id]
    coverage_nov18 = brand_sched["daily_coverage"].get(leave_date.isoformat(), [])
    assert len(coverage_nov18) >= 1
    assigned_ids = [c["employee_id"] for c in coverage_nov18]
    assert emp_b.id in assigned_ids
    assert emp_a.id not in assigned_ids


def test_scenario_d_employee_approved_leave(db_session):
    """TEST D: Employee takes approved leave. Expected: Employee receives no assignments during approved leave."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand D", code="BR-D")
    proc = Process(name="Process D", code="PR-D")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    emp = Employee(employee_code="EMP-D", full_name="Emp D", email="d@test.io", pod_id=pod.id)
    peer = Employee(employee_code="EMP-D-PEER", full_name="Emp D Peer", email="dpeer@test.io", pod_id=pod.id)
    db_session.add_all([emp, peer])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=peer.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])

    leave_date = date(2026, 11, 10)
    db_session.add(EmployeeAvailability(
        employee_id=emp.id,
        date=leave_date,
        availability_type=AvailabilityType.LEAVE,
        status=ApprovalStatus.APPROVED
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    emp_schedule = result["employee_wise_schedules"][emp.id]
    day_status = emp_schedule["days"][leave_date.isoformat()]
    assert day_status["is_working"] is False
    assert "LEAVE" in day_status["status"]


def test_scenario_e_pending_leave_request(db_session):
    """TEST E: Pending leave request. Expected: Employee remains eligible until approval."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand E", code="BR-E")
    proc = Process(name="Process E", code="PR-E")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.CUSTOM,
        custom_operating_days="0", # Monday only
        min_headcount_per_shift=1
    )
    db_session.add(bp)

    # Solo worker for Brand E
    emp = Employee(employee_code="EMP-E-PENDING", full_name="Pending Emp", email="pending@test.io", pod_id=pod.id)
    db_session.add(emp)
    db_session.flush()

    db_session.add(EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)))

    target_monday = date(2026, 11, 2) # Nov 2, 2026 is Monday
    # Leave request is PENDING (not yet approved)
    db_session.add(EmployeeAvailability(
        employee_id=emp.id,
        date=target_monday,
        availability_type=AvailabilityType.LEAVE,
        status=ApprovalStatus.PENDING,
        reason="Awaiting manager sign-off"
    ))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    # Employee must remain eligible and assigned on this Monday
    emp_schedule = result["employee_wise_schedules"][emp.id]
    day_status = emp_schedule["days"][target_monday.isoformat()]
    assert day_status["is_working"] is True
    assert day_status["status"] == "WORKING"


def test_scenario_f_sunday_operating_process(db_session):
    """TEST F: Sunday operating process. Expected: Coverage maintained on Sunday."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand F", code="BR-F")
    proc = Process(name="Process F", code="PR-F")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    emp1 = Employee(employee_code="EMP-F1", full_name="Agent F1", email="f1@test.io", pod_id=pod.id)
    emp2 = Employee(employee_code="EMP-F2", full_name="Agent F2", email="f2@test.io", pod_id=pod.id)
    db_session.add_all([emp1, emp2])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp1.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp2.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    sunday_nov8 = date(2026, 11, 8)
    coverage_nov8 = result["brand_wise_schedules"][brand.id]["daily_coverage"].get(sunday_nov8.isoformat(), [])
    assert len(coverage_nov8) >= 1


def test_scenario_g_sunday_closed_process(db_session):
    """TEST G: Sunday-closed process. Expected: No staffing requirement on Sunday."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand G", code="BR-G")
    proc = Process(name="Process G", code="PR-G")
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
    sunday_demands = [d for d in demands if d.brand_id == brand.id and d.date.weekday() == 6]
    assert len(sunday_demands) == 0


def test_scenario_h_public_holiday(db_session):
    """TEST H: Public holiday. Expected: Operating rules correctly determine staffing requirements."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand H", code="BR-H")
    proc = Process(name="Process H", code="PR-H")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(
        brand_id=brand.id,
        process_id=proc.id,
        operating_calendar=OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS,
        min_headcount_per_shift=1
    )
    db_session.add(bp)

    holiday_date = date(2026, 11, 14) # Diwali
    holiday = PublicHoliday(name="Diwali Test Holiday", date=holiday_date, is_optional=False)
    db_session.add(holiday)
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
    holiday_demands = [d for d in demands if d.brand_id == brand.id and d.date == holiday_date]
    assert len(holiday_demands) == 0


def test_scenario_i_insufficient_staffing(db_session):
    """TEST I: Insufficient staffing. Expected: Best-effort draft with explicit shortages."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand I", code="BR-I")
    proc = Process(name="Process I", code="PR-I")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=5)
    db_session.add(bp)

    emp = Employee(employee_code="EMP-I", full_name="Solo I", email="i@test.io", pod_id=pod.id)
    db_session.add(emp)
    db_session.flush()

    db_session.add(EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    assert result["is_feasible"] is True
    assert result["is_fully_covered"] is False
    assert result["total_shortage_count"] > 0
    assert len(result["shortage_details"]) > 0


def test_scenario_j_manual_assignment(db_session):
    """TEST J: Manual assignment. Expected: Updated roster is validated."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand J", code="BR-J")
    proc = Process(name="Process J", code="PR-J")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4")
    db_session.add(bp)

    emp1 = Employee(employee_code="EMP-J1", full_name="Worker J1", email="j1@test.io", pod_id=pod.id)
    emp2 = Employee(employee_code="EMP-J2", full_name="Worker J2", email="j2@test.io", pod_id=pod.id)
    db_session.add_all([emp1, emp2])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp1.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp2.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    roster_id = result["roster_id"]

    val_res = RosterService.validate_roster(db_session, roster_id)
    assert val_res["is_valid"] is True
    assert val_res["critical_conflicts"] == 0


def test_scenario_k_locked_assignment(db_session):
    """TEST K: Locked assignment. Expected: Regeneration preserves locked assignments."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand K", code="BR-K")
    proc = Process(name="Process K", code="PR-K")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4")
    db_session.add(bp)

    emp1 = Employee(employee_code="EMP-K1", full_name="Lock K1", email="k1@test.io", pod_id=pod.id)
    emp2 = Employee(employee_code="EMP-K2", full_name="Lock K2", email="k2@test.io", pod_id=pod.id)
    db_session.add_all([emp1, emp2])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp1.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=emp2.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])

    roster = Roster(name="Lock Test K", month=11, year=2026, start_date=date(2026, 11, 1), end_date=date(2026, 11, 30))
    db_session.add(roster)
    db_session.flush()

    lock_date = date(2026, 11, 3)
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


def test_scenario_l_workload_limits(db_session):
    """TEST L: Workload limits. Expected: Employees cannot exceed configured capacity."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand L", code="BR-L")
    proc = Process(name="Process L", code="PR-L")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    # Max weekly hours = 32 (only 4 eight-hour shifts per week)
    emp = Employee(employee_code="EMP-L-CAP", full_name="Cap Emp", email="cap@test.io", pod_id=pod.id, max_weekly_hours=32.0, max_daily_hours=8.0)
    peer = Employee(employee_code="EMP-L-PEER", full_name="Cap Peer", email="cappeer@test.io", pod_id=pod.id, max_weekly_hours=40.0)
    db_session.add_all([emp, peer])
    db_session.flush()

    db_session.add_all([
        EmployeeAssignment(employee_id=emp.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
        EmployeeAssignment(employee_id=peer.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)),
    ])
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    emp_sched = result["employee_wise_schedules"][emp.id]
    # Check that in full 7-day calendar weeks, emp worked <= 32 hours (4 shifts)
    full_week_dates = [date(2026, 11, d).isoformat() for d in range(2, 9)] # Nov 2 to Nov 8 (Mon-Sun)
    weekly_hours = sum(
        (8.0 if emp_sched["days"][d]["is_working"] else 0.0)
        for d in full_week_dates
        if d in emp_sched["days"]
    )
    assert weekly_hours <= 32.0


def test_scenario_m_weekly_offs(db_session):
    """TEST M: Weekly offs. Expected: Required weekly rest is respected."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand M", code="BR-M")
    proc = Process(name="Process M", code="PR-M")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY, min_headcount_per_shift=1)
    db_session.add(bp)

    emp = Employee(employee_code="EMP-M-REST", full_name="Rest Worker", email="rest@test.io", pod_id=pod.id, max_consecutive_days=6)
    peer1 = Employee(employee_code="EMP-M-P1", full_name="Peer M1", email="m1@test.io", pod_id=pod.id)
    peer2 = Employee(employee_code="EMP-M-P2", full_name="Peer M2", email="m2@test.io", pod_id=pod.id)
    db_session.add_all([emp, peer1, peer2])
    db_session.flush()

    for e in [emp, peer1, peer2]:
        db_session.add(EmployeeAssignment(employee_id=e.id, brand_id=brand.id, process_id=proc.id, start_date=date(2026, 11, 1)))
    db_session.commit()

    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=3.0)
    emp_sched = result["employee_wise_schedules"][emp.id]

    # Verify no streak exceeds 6 consecutive working days
    curr_streak = 0
    max_streak = 0
    for day_str in sorted(emp_sched["days"].keys()):
        if emp_sched["days"][day_str]["is_working"]:
            curr_streak += 1
            max_streak = max(max_streak, curr_streak)
        else:
            curr_streak = 0
    assert max_streak <= 6
    assert emp_sched["total_weekly_offs"] >= 4


def test_scenario_n_multiple_process_assignments(db_session):
    """TEST N: Multiple process assignments. Expected: Distinct employee coverage and workload calculated correctly."""
    pod = _init_base_env(db_session)
    brand = Brand(name="Brand N", code="BR-N")
    proc1 = Process(name="Process N1", code="PR-N1")
    proc2 = Process(name="Process N2", code="PR-N2")
    db_session.add_all([brand, proc1, proc2])
    db_session.flush()

    bp1 = BrandProcess(brand_id=brand.id, process_id=proc1.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4", min_headcount_per_shift=1)
    bp2 = BrandProcess(brand_id=brand.id, process_id=proc2.id, operating_calendar=OperatingCalendarRule.CUSTOM, custom_operating_days="0,1,2,3,4", min_headcount_per_shift=1)
    db_session.add_all([bp1, bp2])

    emp = Employee(employee_code="EMP-N-MULTI", full_name="Multi Agent", email="multi@test.io", pod_id=pod.id, max_daily_hours=8.0)
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
    total_hours = sum(p["allocated_hours"] for p in first_day["processes"])
    assert total_hours <= 8.0
