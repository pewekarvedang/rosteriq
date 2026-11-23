from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PublicHolidayBase(BaseModel):
    name: str = Field(..., max_length=120, examples=["Republic Day"])
    date: date
    description: Optional[str] = None
    is_optional: bool = False
    applicable_region: str = Field("ALL", max_length=50)


class PublicHolidayCreate(PublicHolidayBase):
    pass


class PublicHolidayUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    date: Optional[date] = None
    description: Optional[str] = None
    is_optional: Optional[bool] = None
    applicable_region: Optional[str] = Field(None, max_length=50)


class PublicHolidayResponse(PublicHolidayBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
