from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.services.employee_service import EmployeeService
from app.utils.auth import require_role, UserRole, CurrentUser

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("", response_model=List[EmployeeResponse])
def get_employees(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    pod_id: Optional[int] = Query(None, description="Filter by operational pod ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    employees = EmployeeService.get_all(db, skip=skip, limit=limit, pod_id=pod_id, is_active=is_active)
    result = []
    for emp in employees:
        resp = EmployeeResponse.model_validate(emp)
        resp.pod_name = emp.pod.name if emp.pod else None
        result.append(resp)
    return result


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    emp = EmployeeService.create(db, data)
    resp = EmployeeResponse.model_validate(emp)
    resp.pod_name = emp.pod.name if emp.pod else None
    return resp


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = EmployeeService.get_by_id(db, employee_id)
    resp = EmployeeResponse.model_validate(emp)
    resp.pod_name = emp.pod.name if emp.pod else None
    return resp


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = EmployeeService.update(db, employee_id, data)
    resp = EmployeeResponse.model_validate(emp)
    resp.pod_name = emp.pod.name if emp.pod else None
    return resp


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER))
):
    EmployeeService.delete(db, employee_id)
    return None
