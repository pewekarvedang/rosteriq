from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class RosterAssignmentProcessBase(BaseModel):
    brand_id: int
    process_id: int
    allocated_hours: float = Field(8.0, ge=0.5, le=24.0)
    is_primary: bool = True


class RosterAssignmentProcessResponse(RosterAssignmentProcessBase):
    id: int
    brand_name: Optional[str] = None
    process_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RosterAssignmentBase(BaseModel):
    roster_id: int
    employee_id: int
    date: date
    shift_id: Optional[int] = None
    is_off: bool = False
    off_reason: Optional[str] = None
    is_locked: bool = False
    is_manual_override: bool = False
    notes: Optional[str] = None


class RosterAssignmentCreate(RosterAssignmentBase):
    processes: Optional[List[RosterAssignmentProcessBase]] = None


class RosterAssignmentUpdate(BaseModel):
    shift_id: Optional[int] = None
    is_off: Optional[bool] = None
    off_reason: Optional[str] = None
    is_locked: Optional[bool] = None
    is_manual_override: Optional[bool] = None
    notes: Optional[str] = None
    processes: Optional[List[RosterAssignmentProcessBase]] = None


class RosterAssignmentLockRequest(BaseModel):
    is_locked: bool = True


class RosterAssignmentResponse(RosterAssignmentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    employee_name: Optional[str] = None
    shift_name: Optional[str] = None
    processes: List[RosterAssignmentProcessResponse] = []

    model_config = ConfigDict(from_attributes=True)
