from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.employee_availability import (
    EmployeeAvailabilityCreate,
    EmployeeAvailabilityUpdate,
    EmployeeAvailabilityResponse,
)
from app.services.availability_service import AvailabilityService
from app.utils.auth import require_role, UserRole, CurrentUser

router = APIRouter(prefix="/employee-availability", tags=["Employee Availability"])


@router.get("", response_model=List[EmployeeAvailabilityResponse])
def get_availabilities(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    employee_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    items = AvailabilityService.get_all(
        db, skip=skip, limit=limit, employee_id=employee_id, start_date=start_date, end_date=end_date
    )
    result = []
    for item in items:
        resp = EmployeeAvailabilityResponse.model_validate(item)
        resp.employee_name = item.employee.full_name if item.employee else None
        result.append(resp)
    return result


@router.post("", response_model=EmployeeAvailabilityResponse, status_code=status.HTTP_201_CREATED)
def create_availability(data: EmployeeAvailabilityCreate, db: Session = Depends(get_db)):
    record = AvailabilityService.create(db, data)
    resp = EmployeeAvailabilityResponse.model_validate(record)
    resp.employee_name = record.employee.full_name if record.employee else None
    return resp


@router.get("/{record_id}", response_model=EmployeeAvailabilityResponse)
def get_availability(record_id: int, db: Session = Depends(get_db)):
    record = AvailabilityService.get_by_id(db, record_id)
    resp = EmployeeAvailabilityResponse.model_validate(record)
    resp.employee_name = record.employee.full_name if record.employee else None
    return resp


@router.put("/{record_id}", response_model=EmployeeAvailabilityResponse)
def update_availability(
    record_id: int,
    data: EmployeeAvailabilityUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD))
):
    record = AvailabilityService.update(db, record_id, data)
    resp = EmployeeAvailabilityResponse.model_validate(record)
    resp.employee_name = record.employee.full_name if record.employee else None
    return resp


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_availability(
    record_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER, UserRole.POD_LEAD))
):
    AvailabilityService.delete(db, record_id)
    return None
