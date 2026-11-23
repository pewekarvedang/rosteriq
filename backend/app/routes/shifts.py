from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftResponse
from app.services.shift_service import ShiftService

router = APIRouter(prefix="/shifts", tags=["Shifts"])


@router.get("", response_model=List[ShiftResponse])
def get_shifts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    shifts = ShiftService.get_all(db, skip=skip, limit=limit, is_active=is_active)
    return [ShiftResponse.model_validate(s) for s in shifts]


@router.post("", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(data: ShiftCreate, db: Session = Depends(get_db)):
    shift = ShiftService.create(db, data)
    return ShiftResponse.model_validate(shift)


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = ShiftService.get_by_id(db, shift_id)
    return ShiftResponse.model_validate(shift)


@router.put("/{shift_id}", response_model=ShiftResponse)
def update_shift(shift_id: int, data: ShiftUpdate, db: Session = Depends(get_db)):
    shift = ShiftService.update(db, shift_id, data)
    return ShiftResponse.model_validate(shift)


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    ShiftService.delete(db, shift_id)
    return None
