from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.process import ProcessCreate, ProcessUpdate, ProcessResponse
from app.services.process_service import ProcessService
from app.utils.auth import require_role, UserRole, CurrentUser

router = APIRouter(prefix="/processes", tags=["Processes"])


@router.get("", response_model=List[ProcessResponse])
def get_processes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    processes = ProcessService.get_all(db, skip=skip, limit=limit, is_active=is_active)
    return [ProcessResponse.model_validate(p) for p in processes]


@router.post("", response_model=ProcessResponse, status_code=status.HTTP_201_CREATED)
def create_process(data: ProcessCreate, db: Session = Depends(get_db)):
    proc = ProcessService.create(db, data)
    return ProcessResponse.model_validate(proc)


@router.get("/{process_id}", response_model=ProcessResponse)
def get_process(process_id: int, db: Session = Depends(get_db)):
    proc = ProcessService.get_by_id(db, process_id)
    return ProcessResponse.model_validate(proc)


@router.put("/{process_id}", response_model=ProcessResponse)
def update_process(process_id: int, data: ProcessUpdate, db: Session = Depends(get_db)):
    proc = ProcessService.update(db, process_id, data)
    return ProcessResponse.model_validate(proc)


@router.delete("/{process_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_process(
    process_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER))
):
    ProcessService.delete(db, process_id)
    return None
