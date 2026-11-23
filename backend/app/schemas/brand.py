from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class BrandBase(BaseModel):
    name: str = Field(..., max_length=120, examples=["BellaVita Organic"])
    code: str = Field(..., max_length=50, examples=["BELLAVITA"])
    client_name: Optional[str] = Field(None, max_length=120, examples=["Bella Vita Ltd."])
    description: Optional[str] = None
    is_active: bool = True


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    code: Optional[str] = Field(None, max_length=50)
    client_name: Optional[str] = Field(None, max_length=120)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BrandResponse(BrandBase):
    id: int
    created_at: datetime
    updated_at: datetime
    process_count: int = 0
    assigned_employee_count: int = 0

    model_config = ConfigDict(from_attributes=True)
