from datetime import datetime, date, time
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.employee_availability import AvailabilityType, ApprovalStatus


class EmployeeAvailabilityBase(BaseModel):
    employee_id: int
    date: date
    availability_type: AvailabilityType = AvailabilityType.LEAVE
    leave_type: Optional[str] = Field(None, examples=["PLANNED_LEAVE", "SICK_LEAVE", "COMP_OFF"])
    status: ApprovalStatus = ApprovalStatus.APPROVED
    reason: Optional[str] = None
    is_full_day: bool = True
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class EmployeeAvailabilityCreate(EmployeeAvailabilityBase):
    pass


class EmployeeAvailabilityUpdate(BaseModel):
    availability_type: Optional[AvailabilityType] = None
    leave_type: Optional[str] = None
    status: Optional[ApprovalStatus] = None
    reason: Optional[str] = None
    is_full_day: Optional[bool] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class EmployeeAvailabilityResponse(EmployeeAvailabilityBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
