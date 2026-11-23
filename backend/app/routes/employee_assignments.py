from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.employee_assignment import (
    EmployeeAssignmentCreate,
    EmployeeAssignmentUpdate,
    EmployeeAssignmentResponse,
)
from app.services.assignment_service import AssignmentService

router = APIRouter(prefix="/employee-assignments", tags=["Employee Assignments"])


@router.get("", response_model=List[EmployeeAssignmentResponse])
def get_assignments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    employee_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    process_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    items = AssignmentService.get_all(
        db, skip=skip, limit=limit, employee_id=employee_id, brand_id=brand_id, process_id=process_id, is_active=is_active
    )
    result = []
    for a in items:
        resp = EmployeeAssignmentResponse.model_validate(a)
        resp.employee_name = a.employee.full_name if a.employee else None
        resp.brand_name = a.brand.name if a.brand else None
        resp.process_name = a.process.name if a.process else None
        result.append(resp)
    return result


@router.post("", response_model=EmployeeAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(data: EmployeeAssignmentCreate, db: Session = Depends(get_db)):
    a = AssignmentService.create(db, data)
    resp = EmployeeAssignmentResponse.model_validate(a)
    resp.employee_name = a.employee.full_name if a.employee else None
    resp.brand_name = a.brand.name if a.brand else None
    resp.process_name = a.process.name if a.process else None
    return resp


@router.get("/{assignment_id}", response_model=EmployeeAssignmentResponse)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    a = AssignmentService.get_by_id(db, assignment_id)
    resp = EmployeeAssignmentResponse.model_validate(a)
    resp.employee_name = a.employee.full_name if a.employee else None
    resp.brand_name = a.brand.name if a.brand else None
    resp.process_name = a.process.name if a.process else None
    return resp


@router.put("/{assignment_id}", response_model=EmployeeAssignmentResponse)
def update_assignment(assignment_id: int, data: EmployeeAssignmentUpdate, db: Session = Depends(get_db)):
    a = AssignmentService.update(db, assignment_id, data)
    resp = EmployeeAssignmentResponse.model_validate(a)
    resp.employee_name = a.employee.full_name if a.employee else None
    resp.brand_name = a.brand.name if a.brand else None
    resp.process_name = a.process.name if a.process else None
    return resp


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    AssignmentService.delete(db, assignment_id)
    return None
