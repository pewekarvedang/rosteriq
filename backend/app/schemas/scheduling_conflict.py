from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.scheduling_conflict import ConflictSeverity


class SchedulingConflictResponse(BaseModel):
    id: int
    roster_id: int
    conflict_type: str
    severity: ConflictSeverity
    date: date
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    brand_id: Optional[int] = None
    brand_name: Optional[str] = None
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    description: str
    resolution_suggestion: Optional[str] = None
    is_resolved: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SchedulingConflictResolve(BaseModel):
    is_resolved: bool = True
