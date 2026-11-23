from datetime import date, time
import pytest
from sqlalchemy.exc import IntegrityError
from app.models.employee import Employee
from app.models.pod import Pod
from app.models.brand import Brand
from app.models.process import Process
from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.models.shift import Shift
from app.models.public_holiday import PublicHoliday
from app.models.roster import Roster, RosterStatus
from app.models.scheduling_conflict import SchedulingConflict, ConflictSeverity
from app.services.conflict_service import ConflictService


def test_unique_public_holiday_date_constraint(db_session):
    """Tests that two public holidays cannot have the same date."""
    h1 = PublicHoliday(name="Holiday One", date=date(2026, 8, 15))
    db_session.add(h1)
    db_session.commit()

    h2 = PublicHoliday(name="Holiday Two", date=date(2026, 8, 15))
    db_session.add(h2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_unique_shift_code_constraint(db_session):
    """Tests that shift codes are unique across the system."""
    s1 = Shift(name="Shift A", code="SHIFT-UNIQUE", start_time=time(8, 0), end_time=time(16, 0))
    db_session.add(s1)
    db_session.commit()

    s2 = Shift(name="Shift B", code="SHIFT-UNIQUE", start_time=time(9, 0), end_time=time(17, 0))
    db_session.add(s2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_roster_conflict_resolution_workflow(db_session):
    """Tests detecting conflicts and marking them resolved."""
    roster = Roster(
        name="Conflict Test Roster",
        month=11,
        year=2026,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 30),
        status=RosterStatus.DRAFT,
        version=1
    )
    db_session.add(roster)
    db_session.flush()

    conflict = SchedulingConflict(
        roster_id=roster.id,
        conflict_type="COVERAGE_GAP",
        severity=ConflictSeverity.CRITICAL,
        date=date(2026, 11, 5),
        description="Missing coverage for CS",
        is_resolved=False
    )
    db_session.add(conflict)
    db_session.commit()

    assert conflict.is_resolved is False

    conflict.is_resolved = True
    conflict.resolution_suggestion = "Manual backup assigned"
    db_session.commit()

    reloaded = db_session.get(SchedulingConflict, conflict.id)
    assert reloaded.is_resolved is True
    assert reloaded.resolution_suggestion == "Manual backup assigned"
