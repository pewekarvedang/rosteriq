from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.models.scheduling_conflict import SchedulingConflict
from app.schemas.scheduling_conflict import SchedulingConflictResponse, SchedulingConflictResolve

router = APIRouter(prefix="/conflicts", tags=["Scheduling Conflicts"])


@router.get("", response_model=List[SchedulingConflictResponse])
def list_conflicts(
    roster_id: Optional[int] = None,
    is_resolved: Optional[bool] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    stmt = select(SchedulingConflict)
    if roster_id is not None:
        stmt = stmt.where(SchedulingConflict.roster_id == roster_id)
    if is_resolved is not None:
        stmt = stmt.where(SchedulingConflict.is_resolved == is_resolved)
    if severity is not None:
        stmt = stmt.where(SchedulingConflict.severity == severity)
    conflicts = list(db.scalars(stmt).all())

    result = []
    for c in conflicts:
        c_resp = SchedulingConflictResponse.model_validate(c)
        c_resp.employee_name = c.employee.full_name if c.employee else None
        c_resp.brand_name = c.brand.name if c.brand else None
        c_resp.process_name = c.process.name if c.process else None
        result.append(c_resp)
    return result


@router.put("/{conflict_id}/resolve", response_model=SchedulingConflictResponse)
def resolve_conflict(conflict_id: int, data: SchedulingConflictResolve, db: Session = Depends(get_db)):
    c = db.get(SchedulingConflict, conflict_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Conflict {conflict_id} not found")
    c.is_resolved = data.is_resolved
    db.commit()
    db.refresh(c)

    c_resp = SchedulingConflictResponse.model_validate(c)
    c_resp.employee_name = c.employee.full_name if c.employee else None
    c_resp.brand_name = c.brand.name if c.brand else None
    c_resp.process_name = c.process.name if c.process else None
    return c_resp
