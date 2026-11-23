from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.employee import Employee
from app.models.pod import Pod
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeService:
    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        pod_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[Employee]:
        stmt = select(Employee)
        if pod_id is not None:
            stmt = stmt.where(Employee.pod_id == pod_id)
        if is_active is not None:
            stmt = stmt.where(Employee.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, employee_id: int) -> Employee:
        emp = db.get(Employee, employee_id)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with id {employee_id} not found"
            )
        return emp

    @staticmethod
    def create(db: Session, data: EmployeeCreate) -> Employee:
        # Check uniqueness of code and email
        existing_code = db.scalar(select(Employee).where(Employee.employee_code == data.employee_code))
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee code '{data.employee_code}' already exists"
            )
        existing_email = db.scalar(select(Employee).where(Employee.email == data.email))
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{data.email}' already exists"
            )

        if data.pod_id is not None:
            pod = db.get(Pod, data.pod_id)
            if not pod:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Pod with id {data.pod_id} does not exist"
                )

        emp = Employee(**data.model_dump())
        db.add(emp)
        db.commit()
        db.refresh(emp)
        return emp

    @staticmethod
    def update(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee:
        emp = EmployeeService.get_by_id(db, employee_id)
        update_data = data.model_dump(exclude_unset=True)

        if "employee_code" in update_data and update_data["employee_code"] != emp.employee_code:
            existing = db.scalar(select(Employee).where(Employee.employee_code == update_data["employee_code"]))
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee code already in use")

        if "email" in update_data and update_data["email"] != emp.email:
            existing = db.scalar(select(Employee).where(Employee.email == update_data["email"]))
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")

        if "pod_id" in update_data and update_data["pod_id"] is not None:
            pod = db.get(Pod, update_data["pod_id"])
            if not pod:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Pod with id {update_data['pod_id']} not found")

        for field, value in update_data.items():
            setattr(emp, field, value)

        db.commit()
        db.refresh(emp)
        return emp

    @staticmethod
    def delete(db: Session, employee_id: int) -> None:
        emp = EmployeeService.get_by_id(db, employee_id)
        db.delete(emp)
        db.commit()
