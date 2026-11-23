from datetime import date
from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.utils.calendar_utils import (
    is_brand_process_operating_on_date,
    explain_operating_rule,
    get_operating_dates_in_range,
)


def test_operating_calendar_everyday():
    """TASK 3: EVERYDAY rule must require coverage 365 days a year, including Sundays and holidays."""
    bp = BrandProcess(
        id=1,
        brand_id=1,
        process_id=1,
        operating_calendar=OperatingCalendarRule.EVERYDAY,
        is_active=True
    )
    holidays = {date(2026, 11, 8)}  # Diwali (Public Holiday)

    # Monday (normal weekday)
    mon = date(2026, 11, 2)
    assert is_brand_process_operating_on_date(bp, mon, holidays) is True

    # Sunday
    sun = date(2026, 11, 8)  # Also holiday
    assert is_brand_process_operating_on_date(bp, sun, holidays) is True


def test_operating_calendar_except_public_holidays():
    """TASK 3: EXCEPT_PUBLIC_HOLIDAYS operates every day (including Sundays) EXCEPT declared holidays."""
    bp = BrandProcess(
        id=2,
        brand_id=1,
        process_id=2,
        operating_calendar=OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS,
        is_active=True
    )
    diwali = date(2026, 11, 8)
    holidays = {diwali}

    # Normal Sunday that is NOT a public holiday
    regular_sun = date(2026, 11, 15)
    assert is_brand_process_operating_on_date(bp, regular_sun, holidays) is True

    # Normal Monday
    mon = date(2026, 11, 2)
    assert is_brand_process_operating_on_date(bp, mon, holidays) is True

    # Public Holiday date -> Closed / Not operating
    assert is_brand_process_operating_on_date(bp, diwali, holidays) is False


def test_operating_calendar_except_sundays_and_holidays():
    """TASK 3: EXCEPT_SUNDAYS_AND_HOLIDAYS operates Mon-Sat except on public holidays."""
    bp = BrandProcess(
        id=3,
        brand_id=2,
        process_id=1,
        operating_calendar=OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS,
        is_active=True
    )
    republic_day = date(2026, 1, 26)  # Monday
    holidays = {republic_day}

    # Normal Tuesday
    tue = date(2026, 1, 27)
    assert is_brand_process_operating_on_date(bp, tue, holidays) is True

    # Normal Saturday
    sat = date(2026, 1, 31)
    assert is_brand_process_operating_on_date(bp, sat, holidays) is True

    # Sunday -> Closed
    sun = date(2026, 2, 1)
    assert is_brand_process_operating_on_date(bp, sun, holidays) is False

    # Republic Day (Monday holiday) -> Closed
    assert is_brand_process_operating_on_date(bp, republic_day, holidays) is False


def test_operating_calendar_custom_schedule():
    """TASK 3: CUSTOM schedule operates only on configured days of week, respecting holidays."""
    # Custom: Tuesday to Saturday (weekdays 1, 2, 3, 4, 5)
    bp = BrandProcess(
        id=4,
        brand_id=3,
        process_id=1,
        operating_calendar=OperatingCalendarRule.CUSTOM,
        custom_operating_days="1,2,3,4,5",
        is_active=True
    )
    holidays = {date(2026, 11, 11)}  # Wednesday holiday

    # Monday (0) -> Not in custom schedule -> Closed
    mon = date(2026, 11, 9)
    assert is_brand_process_operating_on_date(bp, mon, holidays) is False

    # Tuesday (1) -> Active
    tue = date(2026, 11, 10)
    assert is_brand_process_operating_on_date(bp, tue, holidays) is True

    # Wednesday (2) on Holiday -> Closed
    wed_holiday = date(2026, 11, 11)
    assert is_brand_process_operating_on_date(bp, wed_holiday, holidays) is False

    # Saturday (5) -> Active
    sat = date(2026, 11, 14)
    assert is_brand_process_operating_on_date(bp, sat, holidays) is True

    # Sunday (6) -> Closed
    sun = date(2026, 11, 15)
    assert is_brand_process_operating_on_date(bp, sun, holidays) is False


def test_explain_operating_rule_transparency():
    """Tests the structured explanation helper for UI transparency."""
    bp = BrandProcess(
        id=5,
        brand_id=1,
        process_id=1,
        operating_calendar=OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS,
        min_headcount_per_shift=2,
        is_active=True
    )
    sun = date(2026, 11, 8)
    exp = explain_operating_rule(bp, sun, set())
    assert exp["is_operating"] is False
    assert "Sunday off" in exp["reason"]
    assert exp["min_headcount_per_shift"] == 0
