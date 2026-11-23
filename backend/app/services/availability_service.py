from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.employee_availability import EmployeeAvailability
from app.models.employee import Employee
from app.schemas.employee_availability import EmployeeAvailabilityCreate, EmployeeAvailabilityUpdate


class AvailabilityService:
    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        employee_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[EmployeeAvailability]:
        stmt = select(EmployeeAvailability)
        if employee_id is not None:
            stmt = stmt.where(EmployeeAvailability.employee_id == employee_id)
        if start_date is not None:
            stmt = stmt.where(EmployeeAvailability.date >= start_date)
        if end_date is not None:
            stmt = stmt.where(EmployeeAvailability.date <= end_date)
        stmt = stmt.order_by(EmployeeAvailability.date.asc()).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, record_id: int) -> EmployeeAvailability:
        record = db.get(EmployeeAvailability, record_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Availability record with id {record_id} not found"
            )
        return record

    @staticmethod
    def create(db: Session, data: EmployeeAvailabilityCreate) -> EmployeeAvailability:
        if not db.get(Employee, data.employee_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Employee {data.employee_id} not found")

        # Check existing record for that employee on that date
        existing = db.scalar(
            select(EmployeeAvailability).where(
                EmployeeAvailability.employee_id == data.employee_id,
                EmployeeAvailability.date == data.date
            )
        )
        if existing:
            # Update existing
            for field, val in data.model_dump().items():
                setattr(existing, field, val)
            db.commit()
            db.refresh(existing)
            return existing

        record = EmployeeAvailability(**data.model_dump())
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def update(db: Session, record_id: int, data: EmployeeAvailabilityUpdate) -> EmployeeAvailability:
        record = AvailabilityService.get_by_id(db, record_id)
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(record, field, value)

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def delete(db: Session, record_id: int) -> None:
        record = AvailabilityService.get_by_id(db, record_id)
        db.delete(record)
        db.commit()
