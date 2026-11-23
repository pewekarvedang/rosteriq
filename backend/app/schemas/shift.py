from datetime import datetime, time
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ShiftBase(BaseModel):
    name: str = Field(..., max_length=100, examples=["General Shift"])
    code: str = Field(..., max_length=50, examples=["GENERAL"])
    start_time: time
    end_time: time
    duration_hours: float = Field(8.0, ge=1.0, le=24.0)
    is_overnight: bool = False
    is_active: bool = True


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration_hours: Optional[float] = Field(None, ge=1.0, le=24.0)
    is_overnight: Optional[bool] = None
    is_active: Optional[bool] = None


class ShiftResponse(ShiftBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
