from datetime import date, timedelta
from typing import Set, List, Dict, Any, Union
from app.models.brand_process import OperatingCalendarRule, BrandProcess


def parse_custom_days(custom_str: Union[str, List[int], None]) -> Set[int]:
    """Parses custom active weekdays (0=Monday, 6=Sunday)."""
    if not custom_str:
        return {0, 1, 2, 3, 4}  # default Mon-Fri
    if isinstance(custom_str, list):
        return set(custom_str)
    try:
        parts = str(custom_str).split(",")
        return {int(p.strip()) for p in parts if p.strip().isdigit()}
    except Exception:
        return {0, 1, 2, 3, 4}


def is_brand_process_operating_on_date(
    bp: BrandProcess,
    target_date: date,
    holiday_dates: Set[date]
) -> bool:
    """
    Evaluates whether a brand process has operational coverage requirements on a given date.
    
    Rules supported:
    - EVERYDAY: 365 days a year including Sundays and public holidays.
    - EXCEPT_PUBLIC_HOLIDAYS: All days except declared public holidays.
    - EXCEPT_SUNDAYS_AND_HOLIDAYS: Closed on Sundays (weekday=6) and declared public holidays.
    - CUSTOM: Specific days of week (default Mon-Fri) and closed on public holidays.
    """
    if not bp.is_active:
        return False

    rule = bp.operating_calendar
    is_holiday = target_date in holiday_dates
    weekday = target_date.weekday()  # 0=Monday, 6=Sunday

    if rule == OperatingCalendarRule.EVERYDAY:
        return True

    elif rule == OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS:
        return not is_holiday

    elif rule == OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS:
        if weekday == 6 or is_holiday:
            return False
        return True

    elif rule == OperatingCalendarRule.CUSTOM:
        if is_holiday:
            return False
        allowed_days = parse_custom_days(bp.custom_operating_days)
        return weekday in allowed_days

    return True


def explain_operating_rule(
    bp: BrandProcess,
    target_date: date,
    holiday_dates: Set[date]
) -> Dict[str, Any]:
    """Returns a structured explanation of operating status for transparency and conflict reporting."""
    is_operating = is_brand_process_operating_on_date(bp, target_date, holiday_dates)
    is_holiday = target_date in holiday_dates
    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = weekday_names[target_date.weekday()]

    reason = "Operating per schedule"
    if not is_operating:
        if target_date in holiday_dates:
            reason = f"Public holiday exemption ({target_date})"
        elif target_date.weekday() == 6 and bp.operating_calendar == OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS:
            reason = "Sunday off exemption"
        elif bp.operating_calendar == OperatingCalendarRule.CUSTOM:
            reason = f"Non-operating day for custom schedule ({day_name})"
        elif not bp.is_active:
            reason = "Process is currently deactivated"

    return {
        "brand_process_id": bp.id,
        "date": target_date.isoformat(),
        "day_name": day_name,
        "is_operating": is_operating,
        "operating_rule": bp.operating_calendar.value if hasattr(bp.operating_calendar, "value") else str(bp.operating_calendar),
        "min_headcount_per_shift": bp.min_headcount_per_shift if is_operating else 0,
        "reason": reason
    }


def get_operating_dates_in_range(
    bp: BrandProcess,
    start_date: date,
    end_date: date,
    holiday_dates: Set[date]
) -> List[date]:
    """Returns all dates in the range [start_date, end_date] where the process operates."""
    curr = start_date
    operating_dates = []
    while curr <= end_date:
        if is_brand_process_operating_on_date(bp, curr, holiday_dates):
            operating_dates.append(curr)
        curr += timedelta(days=1)
    return operating_dates
