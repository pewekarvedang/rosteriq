from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class EmployeeAssignmentBase(BaseModel):
    employee_id: int
    brand_id: int
    process_id: Optional[int] = Field(None, description="Specific process or null for all processes of brand")
    brand_process_id: Optional[int] = None
    start_date: date
    end_date: Optional[date] = None
    is_primary: bool = True
    allocation_percentage: float = Field(100.0, ge=0.0, le=100.0)
    is_active: bool = True
    notes: Optional[str] = None


class EmployeeAssignmentCreate(EmployeeAssignmentBase):
    pass


class EmployeeAssignmentUpdate(BaseModel):
    brand_id: Optional[int] = None
    process_id: Optional[int] = None
    brand_process_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_primary: Optional[bool] = None
    allocation_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class EmployeeAssignmentResponse(EmployeeAssignmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    brand_name: Optional[str] = None
    process_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
