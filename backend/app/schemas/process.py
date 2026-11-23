from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProcessBase(BaseModel):
    name: str = Field(..., max_length=100, examples=["Customer Support"])
    code: str = Field(..., max_length=50, examples=["CS"])
    description: Optional[str] = None
    is_active: bool = True


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProcessResponse(ProcessBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
