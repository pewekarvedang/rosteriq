from datetime import date
from typing import List, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.public_holiday import PublicHoliday
from app.schemas.public_holiday import PublicHolidayCreate, PublicHolidayUpdate


class HolidayService:
    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        year: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[PublicHoliday]:
        stmt = select(PublicHoliday)
        if year is not None:
            stmt = stmt.where(
                PublicHoliday.date >= date(year, 1, 1),
                PublicHoliday.date <= date(year, 12, 31)
            )
        if start_date is not None:
            stmt = stmt.where(PublicHoliday.date >= start_date)
        if end_date is not None:
            stmt = stmt.where(PublicHoliday.date <= end_date)
        stmt = stmt.order_by(PublicHoliday.date.asc()).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_holiday_dates_in_range(db: Session, start_date: date, end_date: date) -> Set[date]:
        stmt = select(PublicHoliday.date).where(
            PublicHoliday.date >= start_date,
            PublicHoliday.date <= end_date
        )
        return set(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, holiday_id: int) -> PublicHoliday:
        h = db.get(PublicHoliday, holiday_id)
        if not h:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Public holiday {holiday_id} not found")
        return h

    @staticmethod
    def create(db: Session, data: PublicHolidayCreate) -> PublicHoliday:
        existing = db.scalar(select(PublicHoliday).where(PublicHoliday.date == data.date))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A public holiday is already registered on {data.date} ('{existing.name}')"
            )

        holiday = PublicHoliday(**data.model_dump())
        db.add(holiday)
        db.commit()
        db.refresh(holiday)
        return holiday

    @staticmethod
    def update(db: Session, holiday_id: int, data: PublicHolidayUpdate) -> PublicHoliday:
        holiday = HolidayService.get_by_id(db, holiday_id)
        update_data = data.model_dump(exclude_unset=True)

        if "date" in update_data and update_data["date"] != holiday.date:
            existing = db.scalar(select(PublicHoliday).where(PublicHoliday.date == update_data["date"]))
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"A holiday already exists on {update_data['date']}")

        for field, value in update_data.items():
            setattr(holiday, field, value)

        db.commit()
        db.refresh(holiday)
        return holiday

    @staticmethod
    def delete(db: Session, holiday_id: int) -> None:
        holiday = HolidayService.get_by_id(db, holiday_id)
        db.delete(holiday)
        db.commit()
