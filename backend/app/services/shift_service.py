from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.shift import Shift
from app.schemas.shift import ShiftCreate, ShiftUpdate


class ShiftService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None) -> List[Shift]:
        stmt = select(Shift)
        if is_active is not None:
            stmt = stmt.where(Shift.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, shift_id: int) -> Shift:
        shift = db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shift {shift_id} not found")
        return shift

    @staticmethod
    def create(db: Session, data: ShiftCreate) -> Shift:
        if db.scalar(select(Shift).where(Shift.code == data.code)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Shift code '{data.code}' already exists")

        shift = Shift(**data.model_dump())
        db.add(shift)
        db.commit()
        db.refresh(shift)
        return shift

    @staticmethod
    def update(db: Session, shift_id: int, data: ShiftUpdate) -> Shift:
        shift = ShiftService.get_by_id(db, shift_id)
        update_data = data.model_dump(exclude_unset=True)

        if "code" in update_data and update_data["code"] != shift.code:
            if db.scalar(select(Shift).where(Shift.code == update_data["code"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift code already in use")

        for field, value in update_data.items():
            setattr(shift, field, value)

        db.commit()
        db.refresh(shift)
        return shift

    @staticmethod
    def delete(db: Session, shift_id: int) -> None:
        shift = ShiftService.get_by_id(db, shift_id)
        db.delete(shift)
        db.commit()
