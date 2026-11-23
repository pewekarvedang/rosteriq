from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeBase(BaseModel):
    employee_code: str = Field(..., max_length=50, examples=["EMP001"])
    full_name: str = Field(..., max_length=120, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane.doe@datastraw.io"])
    phone: Optional[str] = Field(None, max_length=30, examples=["+91-9876543210"])
    pod_id: Optional[int] = Field(None, examples=[1])
    max_weekly_hours: float = Field(40.0, ge=0.0, le=80.0)
    max_daily_hours: float = Field(8.0, ge=0.0, le=24.0)
    max_consecutive_days: int = Field(6, ge=1, le=14)
    default_weekly_off_days: str = Field("6", max_length=50, description="Comma-separated weekday numbers (0=Mon, 6=Sun)")
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    employee_code: Optional[str] = Field(None, max_length=50)
    full_name: Optional[str] = Field(None, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    pod_id: Optional[int] = None
    max_weekly_hours: Optional[float] = Field(None, ge=0.0, le=80.0)
    max_daily_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    max_consecutive_days: Optional[int] = Field(None, ge=1, le=14)
    default_weekly_off_days: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime
    pod_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
