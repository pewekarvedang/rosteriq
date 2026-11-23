from datetime import date, time
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from app.models.employee import Employee
from app.models.pod import Pod
from app.models.brand import Brand
from app.models.process import Process
from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.models.employee_assignment import EmployeeAssignment
from app.models.employee_availability import EmployeeAvailability, AvailabilityType
from app.models.shift import Shift
from app.models.roster import Roster, RosterStatus
from app.models.roster_assignment import RosterAssignment
from app.models.roster_assignment_process import RosterAssignmentProcess
from app.models.scheduling_conflict import SchedulingConflict, ConflictSeverity


def test_pod_lead_and_members_relationship(db_session):
    """Tests circular relationship: Employee belongs to Pod, and Pod has designated lead Employee."""
    # 1. Create Lead Employee and Regular Member
    lead_emp = Employee(
        employee_code="LEAD-001",
        full_name="Jonathan Lead",
        email="lead@datastraw.io",
        max_weekly_hours=40.0
    )
    db_session.add(lead_emp)
    db_session.flush()

    # 2. Create Pod with lead_emp as lead
    pod = Pod(
        name="Pod Alpha Test",
        code="POD-ALPHA-TEST",
        lead_id=lead_emp.id
    )
    db_session.add(pod)
    db_session.flush()

    # 3. Assign lead employee and member to the pod
    lead_emp.pod_id = pod.id

    member_emp = Employee(
        employee_code="MEM-002",
        full_name="Alice Member",
        email="alice@datastraw.io",
        pod_id=pod.id,
        max_weekly_hours=40.0
    )
    db_session.add(member_emp)
    db_session.commit()

    # Verify relationships
    reloaded_pod = db_session.get(Pod, pod.id)
    assert reloaded_pod.lead.id == lead_emp.id
    assert reloaded_pod.lead.full_name == "Jonathan Lead"
    assert len(reloaded_pod.members) == 2
    member_codes = [m.employee_code for m in reloaded_pod.members]
    assert "LEAD-001" in member_codes
    assert "MEM-002" in member_codes


def test_multi_brand_and_multi_process_assignments(db_session):
    """
    Business Rules Tested:
    - An employee can work across multiple brands.
    - An employee can handle multiple processes.
    - A brand can have multiple employees.
    - A process can have multiple employees.
    - Employee assignments must support start and end dates.
    """
    emp = Employee(
        employee_code="MULTI-001",
        full_name="Bob Flexible",
        email="bob@datastraw.io"
    )
    db_session.add(emp)

    brand_a = Brand(name="Brand Alpha", code="BA-TEST")
    brand_b = Brand(name="Brand Beta", code="BB-TEST")
    db_session.add_all([brand_a, brand_b])

    proc_cs = Process(name="Customer Support Test", code="CS-TEST")
    proc_acc = Process(name="Cart Conversion Test", code="ACC-TEST")
    db_session.add_all([proc_cs, proc_acc])
    db_session.flush()

    # Employee assigned to Brand A (Process CS) from Jan 1 to June 30
    assign1 = EmployeeAssignment(
        employee_id=emp.id,
        brand_id=brand_a.id,
        process_id=proc_cs.id,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 6, 30),
        allocation_percentage=50.0
    )
    # Same employee assigned to Brand B (Process ACC) starting Jan 1 onwards (open-ended)
    assign2 = EmployeeAssignment(
        employee_id=emp.id,
        brand_id=brand_b.id,
        process_id=proc_acc.id,
        start_date=date(2026, 1, 1),
        end_date=None,
        allocation_percentage=50.0
    )
    db_session.add_all([assign1, assign2])
    db_session.commit()

    # Verify employee has multiple brand & process assignments
    reloaded_emp = db_session.get(Employee, emp.id)
    assert len(reloaded_emp.assignments) == 2
    assigned_brands = {a.brand.name for a in reloaded_emp.assignments}
    assert assigned_brands == {"Brand Alpha", "Brand Beta"}
    assigned_processes = {a.process.name for a in reloaded_emp.assignments}
    assert assigned_processes == {"Customer Support Test", "Cart Conversion Test"}


def test_brand_process_unique_constraint(db_session):
    """Tests that a Brand cannot have duplicate assignments to the same Process."""
    brand = Brand(name="Unique Brand Test", code="UB-TEST")
    proc = Process(name="Unique Process Test", code="UP-TEST")
    db_session.add_all([brand, proc])
    db_session.flush()

    bp1 = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EVERYDAY)
    db_session.add(bp1)
    db_session.commit()

    bp2 = BrandProcess(brand_id=brand.id, process_id=proc.id, operating_calendar=OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS)
    db_session.add(bp2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_employee_availability_unique_date_constraint(db_session):
    """Tests that an employee cannot have conflicting duplicate availability entries on the same date."""
    emp = Employee(employee_code="AVAIL-001", full_name="Charlie Rest", email="charlie@datastraw.io")
    db_session.add(emp)
    db_session.flush()

    avail1 = EmployeeAvailability(
        employee_id=emp.id,
        date=date(2026, 11, 15),
        availability_type=AvailabilityType.LEAVE,
        leave_type="PLANNED_LEAVE"
    )
    db_session.add(avail1)
    db_session.commit()

    avail2 = EmployeeAvailability(
        employee_id=emp.id,
        date=date(2026, 11, 15),
        availability_type=AvailabilityType.COMP_OFF
    )
    db_session.add(avail2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_roster_assignment_locking_and_multi_process(db_session):
    """
    Business Rules Tested:
    - Manual assignments must support locking.
    - One employee may handle multiple processes during a shift if workload capacity permits it.
    """
    emp = Employee(employee_code="ROST-001", full_name="Diana Shift", email="diana@datastraw.io", max_daily_hours=8.0)
    brand = Brand(name="Roster Brand", code="RB-TEST")
    proc1 = Process(name="Process 1", code="P1-TEST")
    proc2 = Process(name="Process 2", code="P2-TEST")
    shift = Shift(name="General Shift", code="GEN-TEST", start_time=time(9, 0), end_time=time(17, 0), duration_hours=8.0)

    db_session.add_all([emp, brand, proc1, proc2, shift])
    db_session.flush()

    roster = Roster(
        name="November 2026 Roster",
        month=11,
        year=2026,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 30),
        status=RosterStatus.DRAFT,
        version=1
    )
    db_session.add(roster)
    db_session.flush()

    # Manual assignment with locking
    ra = RosterAssignment(
        roster_id=roster.id,
        employee_id=emp.id,
        date=date(2026, 11, 5),
        shift_id=shift.id,
        is_locked=True,  # Locked
        is_manual_override=True
    )
    db_session.add(ra)
    db_session.flush()

    # Split 8-hour shift across two processes: 4 hours for P1, 4 hours for P2
    rap1 = RosterAssignmentProcess(
        roster_assignment_id=ra.id,
        brand_id=brand.id,
        process_id=proc1.id,
        allocated_hours=4.0,
        is_primary=True
    )
    rap2 = RosterAssignmentProcess(
        roster_assignment_id=ra.id,
        brand_id=brand.id,
        process_id=proc2.id,
        allocated_hours=4.0,
        is_primary=False
    )
    db_session.add_all([rap1, rap2])
    db_session.commit()

    # Verify locked assignment and multi-process breakdown
    reloaded_ra = db_session.get(RosterAssignment, ra.id)
    assert reloaded_ra.is_locked is True
    assert len(reloaded_ra.processes) == 2
    total_hours = sum(p.allocated_hours for p in reloaded_ra.processes)
    assert total_hours == 8.0
    assert total_hours <= emp.max_daily_hours


def test_roster_version_history_relationship(db_session):
    """
    Business Rules Tested:
    - Rosters must support draft, validated and published states.
    - Rosters must support version history.
    """
    r_v1 = Roster(
        name="Roster Dec 2026 (v1)",
        month=12,
        year=2026,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 31),
        status=RosterStatus.VALIDATED,
        version=1
    )
    db_session.add(r_v1)
    db_session.flush()

    r_v2 = Roster(
        name="Roster Dec 2026 (v2)",
        month=12,
        year=2026,
        start_date=date(2026, 12, 1),
        end_date=date(2026, 12, 31),
        status=RosterStatus.PUBLISHED,
        version=2,
        parent_roster_id=r_v1.id
    )
    db_session.add(r_v2)
    db_session.commit()

    reloaded_v2 = db_session.get(Roster, r_v2.id)
    assert reloaded_v2.parent_roster.id == r_v1.id
    assert reloaded_v2.status == RosterStatus.PUBLISHED
    assert reloaded_v2.version == 2
    assert len(r_v1.child_versions) == 1
    assert r_v1.child_versions[0].id == r_v2.id
