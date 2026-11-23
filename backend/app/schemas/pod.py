from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class PodBase(BaseModel):
    name: str = Field(..., max_length=100, examples=["Pod Alpha"])
    code: str = Field(..., max_length=50, examples=["POD-ALPHA"])
    description: Optional[str] = None
    lead_id: Optional[int] = Field(None, description="Designated pod lead employee ID")
    is_active: bool = True


class PodCreate(PodBase):
    pass


class PodUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    lead_id: Optional[int] = None
    is_active: Optional[bool] = None


class PodResponse(PodBase):
    id: int
    created_at: datetime
    updated_at: datetime
    lead_name: Optional[str] = None
    member_count: int = 0

    model_config = ConfigDict(from_attributes=True)
