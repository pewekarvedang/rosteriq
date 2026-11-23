from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.public_holiday import (
    PublicHolidayCreate,
    PublicHolidayUpdate,
    PublicHolidayResponse,
)
from app.services.holiday_service import HolidayService

router = APIRouter(prefix="/public-holidays", tags=["Public Holidays"])


@router.get("", response_model=List[PublicHolidayResponse])
def get_public_holidays(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    holidays = HolidayService.get_all(db, skip=skip, limit=limit, year=year, start_date=start_date, end_date=end_date)
    return [PublicHolidayResponse.model_validate(h) for h in holidays]


@router.post("", response_model=PublicHolidayResponse, status_code=status.HTTP_201_CREATED)
def create_public_holiday(data: PublicHolidayCreate, db: Session = Depends(get_db)):
    h = HolidayService.create(db, data)
    return PublicHolidayResponse.model_validate(h)


@router.get("/{holiday_id}", response_model=PublicHolidayResponse)
def get_public_holiday(holiday_id: int, db: Session = Depends(get_db)):
    h = HolidayService.get_by_id(db, holiday_id)
    return PublicHolidayResponse.model_validate(h)


@router.put("/{holiday_id}", response_model=PublicHolidayResponse)
def update_public_holiday(holiday_id: int, data: PublicHolidayUpdate, db: Session = Depends(get_db)):
    h = HolidayService.update(db, holiday_id, data)
    return PublicHolidayResponse.model_validate(h)


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_public_holiday(holiday_id: int, db: Session = Depends(get_db)):
    HolidayService.delete(db, holiday_id)
    return None
