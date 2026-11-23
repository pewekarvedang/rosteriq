from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.roster import RosterStatus
from app.schemas.roster import (
    RosterCreate,
    RosterUpdate,
    RosterResponse,
    RosterDetailResponse,
)
from app.schemas.roster_assignment import (
    RosterAssignmentResponse,
    RosterAssignmentProcessResponse,
    RosterAssignmentLockRequest,
)
from app.schemas.scheduling_conflict import SchedulingConflictResponse
from app.services.roster_service import RosterService
from app.services.conflict_service import ConflictService
from app.utils.auth import require_role, UserRole, CurrentUser

router = APIRouter(prefix="/rosters", tags=["Rosters & Scheduling"])


def _build_roster_response(roster) -> RosterResponse:
    resp = RosterResponse.model_validate(roster)
    resp.total_assignments = len(roster.assignments)
    resp.total_conflicts = len(roster.conflicts)
    return resp


@router.get("", response_model=List[RosterResponse])
def get_rosters(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    year: Optional[int] = None,
    month: Optional[int] = None,
    roster_status: Optional[RosterStatus] = None,
    db: Session = Depends(get_db)
):
    rosters = RosterService.get_all(db, skip=skip, limit=limit, year=year, month=month, roster_status=roster_status)
    return [_build_roster_response(r) for r in rosters]


@router.post("", response_model=RosterResponse, status_code=status.HTTP_201_CREATED)
def create_draft_roster(data: RosterCreate, db: Session = Depends(get_db)):
    roster = RosterService.create_draft(db, data)
    return _build_roster_response(roster)


@router.get("/{roster_id}", response_model=RosterDetailResponse)
def get_roster_detail(roster_id: int, db: Session = Depends(get_db)):
    roster = RosterService.get_by_id(db, roster_id)
    resp = RosterDetailResponse.model_validate(roster)
    resp.total_assignments = len(roster.assignments)
    resp.total_conflicts = len(roster.conflicts)

    # Hydrate assignments
    assignment_items = []
    for a in roster.assignments:
        a_resp = RosterAssignmentResponse.model_validate(a)
        a_resp.employee_name = a.employee.full_name if a.employee else None
        a_resp.shift_name = a.shift.name if a.shift else None
        proc_list = []
        for p in a.processes:
            p_resp = RosterAssignmentProcessResponse.model_validate(p)
            p_resp.brand_name = p.brand.name if p.brand else None
            p_resp.process_name = p.process.name if p.process else None
            proc_list.append(p_resp)
        a_resp.processes = proc_list
        assignment_items.append(a_resp)
    resp.assignments = assignment_items

    # Hydrate conflicts
    conflict_items = []
    for c in roster.conflicts:
        c_resp = SchedulingConflictResponse.model_validate(c)
        c_resp.employee_name = c.employee.full_name if c.employee else None
        c_resp.brand_name = c.brand.name if c.brand else None
        c_resp.process_name = c.process.name if c.process else None
        conflict_items.append(c_resp)
    resp.conflicts = conflict_items

    return resp


@router.post("/{roster_id}/generate", response_model=RosterResponse)
def generate_roster(roster_id: int, db: Session = Depends(get_db)):
    roster = RosterService.generate_monthly_roster(db, roster_id)
    return _build_roster_response(roster)


@router.post("/generate-monthly", tags=["Rosters & Scheduling"])
def generate_monthly_roster_endpoint(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2050),
    preserve_locked_assignments: bool = Query(True),
    timeout_seconds: float = Query(30.0, ge=1.0, le=120.0),
    db: Session = Depends(get_db)
):
    from app.services.roster_generator import generate_monthly_roster
    return generate_monthly_roster(
        month=month,
        year=year,
        preserve_locked_assignments=preserve_locked_assignments,
        db=db,
        timeout_seconds=timeout_seconds
    )


@router.post("/{roster_id}/validate")
def validate_roster(roster_id: int, db: Session = Depends(get_db)):
    return RosterService.validate_roster(db, roster_id)


@router.post("/{roster_id}/publish", response_model=RosterResponse)
def publish_roster(
    roster_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER))
):
    roster = RosterService.publish_roster(db, roster_id)
    return _build_roster_response(roster)


@router.post("/{roster_id}/new-version", response_model=RosterResponse, status_code=status.HTTP_201_CREATED)
def branch_new_version(
    roster_id: int,
    notes: Optional[str] = Query(None, description="Notes for this new revision"),
    db: Session = Depends(get_db)
):
    new_roster = RosterService.create_new_version(db, roster_id, notes=notes)
    return _build_roster_response(new_roster)


@router.put("/assignments/{assignment_id}/lock", response_model=RosterAssignmentResponse)
def lock_roster_assignment(
    assignment_id: int,
    data: RosterAssignmentLockRequest,
    db: Session = Depends(get_db)
):
    ra = RosterService.lock_assignment(db, assignment_id, is_locked=data.is_locked)
    resp = RosterAssignmentResponse.model_validate(ra)
    resp.employee_name = ra.employee.full_name if ra.employee else None
    resp.shift_name = ra.shift.name if ra.shift else None
    return resp


@router.get("/{roster_id}/conflicts", response_model=List[SchedulingConflictResponse])
def get_roster_conflicts(roster_id: int, db: Session = Depends(get_db)):
    conflicts = ConflictService.detect_conflicts(db, roster_id)
    result = []
    for c in conflicts:
        c_resp = SchedulingConflictResponse.model_validate(c)
        c_resp.employee_name = c.employee.full_name if c.employee else None
        c_resp.brand_name = c.brand.name if c.brand else None
        c_resp.process_name = c.process.name if c.process else None
        result.append(c_resp)
    return result
