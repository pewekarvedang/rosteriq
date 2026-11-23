from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.roster import RosterStatus
from app.schemas.roster_assignment import RosterAssignmentResponse
from app.schemas.scheduling_conflict import SchedulingConflictResponse


class RosterBase(BaseModel):
    name: str = Field(..., max_length=120, examples=["Roster - November 2026"])
    month: int = Field(..., ge=1, le=12, examples=[11])
    year: int = Field(..., ge=2020, le=2050, examples=[2026])
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_by: str = Field("Operations Manager", max_length=100)
    notes: Optional[str] = None


class RosterCreate(RosterBase):
    pass


class RosterUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    status: Optional[RosterStatus] = None
    notes: Optional[str] = None


class RosterResponse(BaseModel):
    id: int
    name: str
    month: int
    year: int
    start_date: date
    end_date: date
    status: RosterStatus
    version: int
    parent_roster_id: Optional[int] = None
    created_by: str
    validated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_assignments: int = 0
    total_conflicts: int = 0

    model_config = ConfigDict(from_attributes=True)


class RosterDetailResponse(RosterResponse):
    assignments: List[RosterAssignmentResponse] = []
    conflicts: List[SchedulingConflictResponse] = []
