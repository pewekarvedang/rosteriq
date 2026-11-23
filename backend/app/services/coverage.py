from datetime import date, timedelta
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.models.shift import Shift
from app.services.holiday_service import HolidayService
from app.utils.calendar_utils import is_brand_process_operating_on_date


@dataclass(frozen=True)
class DemandSlot:
    """Represents a discrete staffing demand slot for a brand process on a given date and shift."""
    brand_id: int
    process_id: int
    date: date
    shift_id: int
    required_headcount: int


@dataclass
class BrandProcessCoverageSpec:
    brand_id: int
    process_id: int
    brand_process_id: int
    operating_calendar: OperatingCalendarRule
    custom_operating_days: str
    min_headcount_per_shift: int
    requires_24_7: bool


def load_brand_process_specs(db: Session) -> Dict[Tuple[int, int], BrandProcessCoverageSpec]:
    """Loads all active BrandProcess specifications keyed by (brand_id, process_id)."""
    bps = list(db.scalars(select(BrandProcess).where(BrandProcess.is_active == True)).all())
    specs = {}
    for bp in bps:
        specs[(bp.brand_id, bp.process_id)] = BrandProcessCoverageSpec(
            brand_id=bp.brand_id,
            process_id=bp.process_id,
            brand_process_id=bp.id,
            operating_calendar=bp.operating_calendar,
            custom_operating_days=bp.custom_operating_days or "0,1,2,3,4",
            min_headcount_per_shift=max(1, bp.min_headcount_per_shift or 1),
            requires_24_7=bp.requires_24_7 or False
        )
    return specs


def evaluate_monthly_coverage_demands(
    db: Session,
    start_date: date,
    end_date: date,
    shifts: List[Shift],
    specs: Dict[Tuple[int, int], BrandProcessCoverageSpec]
) -> List[DemandSlot]:
    """
    Evaluates required staffing slots for every active brand process across each date in the range,
    incorporating public holiday exemptions, Sunday exemptions, and custom schedules.
    """
    holidays: Set[date] = HolidayService.get_holiday_dates_in_range(db, start_date, end_date)
    demands: List[DemandSlot] = []

    # Identify primary / general shift vs all shifts for 24/7
    general_shift = next((s for s in shifts if s.code == "GENERAL"), shifts[0] if shifts else None)
    if not general_shift:
        raise ValueError("At least one shift must be configured in the system")

    # Reconstruct temporary BrandProcess objects for calendar_utils logic
    curr = start_date
    while curr <= end_date:
        for (b_id, p_id), spec in specs.items():
            temp_bp = BrandProcess(
                id=spec.brand_process_id,
                brand_id=b_id,
                process_id=p_id,
                operating_calendar=spec.operating_calendar,
                custom_operating_days=spec.custom_operating_days,
                min_headcount_per_shift=spec.min_headcount_per_shift,
                requires_24_7=spec.requires_24_7,
                is_active=True
            )
            is_operating = is_brand_process_operating_on_date(temp_bp, curr, holidays)

            if is_operating:
                if spec.requires_24_7:
                    # 24/7 operation requires staffing across all operational shifts
                    for s in shifts:
                        demands.append(DemandSlot(
                            brand_id=b_id,
                            process_id=p_id,
                            date=curr,
                            shift_id=s.id,
                            required_headcount=spec.min_headcount_per_shift
                        ))
                else:
                    # Standard operation: scheduled during primary business shift
                    demands.append(DemandSlot(
                        brand_id=b_id,
                        process_id=p_id,
                        date=curr,
                        shift_id=general_shift.id,
                        required_headcount=spec.min_headcount_per_shift
                    ))

        curr += timedelta(days=1)

    return demands
