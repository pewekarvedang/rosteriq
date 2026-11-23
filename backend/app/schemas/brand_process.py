from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.brand_process import OperatingCalendarRule


class BrandProcessBase(BaseModel):
    brand_id: int
    process_id: int
    operating_calendar: OperatingCalendarRule = OperatingCalendarRule.EVERYDAY
    custom_operating_days: Optional[str] = Field("0,1,2,3,4", description="Comma-separated active weekdays (0=Mon, 6=Sun)")
    min_headcount_per_shift: int = Field(1, ge=1, description="Minimum required employees per shift")
    requires_24_7: bool = False
    is_active: bool = True


class BrandProcessCreate(BrandProcessBase):
    pass


class BrandProcessUpdate(BaseModel):
    operating_calendar: Optional[OperatingCalendarRule] = None
    custom_operating_days: Optional[str] = None
    min_headcount_per_shift: Optional[int] = Field(None, ge=1)
    requires_24_7: Optional[bool] = None
    is_active: Optional[bool] = None


class BrandProcessResponse(BrandProcessBase):
    id: int
    created_at: datetime
    updated_at: datetime
    brand_name: Optional[str] = None
    process_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
