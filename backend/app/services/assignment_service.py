from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.employee_assignment import EmployeeAssignment
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.brand_process import BrandProcess
from app.schemas.employee_assignment import EmployeeAssignmentCreate, EmployeeAssignmentUpdate


class AssignmentService:
    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        employee_id: Optional[int] = None,
        brand_id: Optional[int] = None,
        process_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[EmployeeAssignment]:
        stmt = select(EmployeeAssignment)
        if employee_id is not None:
            stmt = stmt.where(EmployeeAssignment.employee_id == employee_id)
        if brand_id is not None:
            stmt = stmt.where(EmployeeAssignment.brand_id == brand_id)
        if process_id is not None:
            stmt = stmt.where(EmployeeAssignment.process_id == process_id)
        if is_active is not None:
            stmt = stmt.where(EmployeeAssignment.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, assignment_id: int) -> EmployeeAssignment:
        assignment = db.get(EmployeeAssignment, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"EmployeeAssignment with id {assignment_id} not found"
            )
        return assignment

    @staticmethod
    def create(db: Session, data: EmployeeAssignmentCreate) -> EmployeeAssignment:
        # Validate employee
        if not db.get(Employee, data.employee_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Employee {data.employee_id} not found")
        # Validate brand
        if not db.get(Brand, data.brand_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Brand {data.brand_id} not found")
        # Validate process if given
        if data.process_id is not None and not db.get(Process, data.process_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Process {data.process_id} not found")

        # Validate date range
        if data.end_date and data.end_date < data.start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be prior to start date")

        # Auto-link brand_process_id if process is specified and brand_process exists
        brand_process_id = data.brand_process_id
        if data.process_id is not None and not brand_process_id:
            bp = db.scalar(
                select(BrandProcess).where(
                    BrandProcess.brand_id == data.brand_id,
                    BrandProcess.process_id == data.process_id
                )
            )
            if bp:
                brand_process_id = bp.id

        assignment_dict = data.model_dump()
        assignment_dict["brand_process_id"] = brand_process_id

        assignment = EmployeeAssignment(**assignment_dict)
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def update(db: Session, assignment_id: int, data: EmployeeAssignmentUpdate) -> EmployeeAssignment:
        assignment = AssignmentService.get_by_id(db, assignment_id)
        update_data = data.model_dump(exclude_unset=True)

        start = update_data.get("start_date", assignment.start_date)
        end = update_data.get("end_date", assignment.end_date)
        if end and end < start:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be prior to start date")

        for field, value in update_data.items():
            setattr(assignment, field, value)

        db.commit()
        db.refresh(assignment)
        return assignment

    @staticmethod
    def delete(db: Session, assignment_id: int) -> None:
        assignment = AssignmentService.get_by_id(db, assignment_id)
        db.delete(assignment)
        db.commit()
