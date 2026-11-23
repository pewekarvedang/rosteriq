from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.brand_process import BrandProcessCreate, BrandProcessUpdate, BrandProcessResponse
from app.services.brand_process_service import BrandProcessService
from app.services.holiday_service import HolidayService
from app.utils.calendar_utils import explain_operating_rule

router = APIRouter(prefix="/brand-processes", tags=["Brand Processes & Operating Calendars"])


@router.get("", response_model=List[BrandProcessResponse])
def get_brand_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    brand_id: Optional[int] = None,
    process_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    items = BrandProcessService.get_all(db, skip=skip, limit=limit, brand_id=brand_id, process_id=process_id, is_active=is_active)
    result = []
    for bp in items:
        resp = BrandProcessResponse.model_validate(bp)
        resp.brand_name = bp.brand.name if bp.brand else None
        resp.process_name = bp.process.name if bp.process else None
        result.append(resp)
    return result


@router.post("", response_model=BrandProcessResponse, status_code=status.HTTP_201_CREATED)
def create_brand_process(data: BrandProcessCreate, db: Session = Depends(get_db)):
    bp = BrandProcessService.create(db, data)
    resp = BrandProcessResponse.model_validate(bp)
    resp.brand_name = bp.brand.name if bp.brand else None
    resp.process_name = bp.process.name if bp.process else None
    return resp


@router.get("/{bp_id}", response_model=BrandProcessResponse)
def get_brand_process(bp_id: int, db: Session = Depends(get_db)):
    bp = BrandProcessService.get_by_id(db, bp_id)
    resp = BrandProcessResponse.model_validate(bp)
    resp.brand_name = bp.brand.name if bp.brand else None
    resp.process_name = bp.process.name if bp.process else None
    return resp


@router.put("/{bp_id}", response_model=BrandProcessResponse)
def update_brand_process(bp_id: int, data: BrandProcessUpdate, db: Session = Depends(get_db)):
    bp = BrandProcessService.update(db, bp_id, data)
    resp = BrandProcessResponse.model_validate(bp)
    resp.brand_name = bp.brand.name if bp.brand else None
    resp.process_name = bp.process.name if bp.process else None
    return resp


@router.delete("/{bp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand_process(bp_id: int, db: Session = Depends(get_db)):
    BrandProcessService.delete(db, bp_id)
    return None


@router.get("/{bp_id}/evaluate-date")
def evaluate_brand_process_date(
    bp_id: int,
    target_date: date = Query(..., description="Target date to check operational requirement"),
    db: Session = Depends(get_db)
):
    bp = BrandProcessService.get_by_id(db, bp_id)
    holidays = HolidayService.get_holiday_dates_in_range(db, target_date, target_date)
    return explain_operating_rule(bp, target_date, holidays)
