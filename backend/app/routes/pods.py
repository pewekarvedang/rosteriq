from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.pod import PodCreate, PodUpdate, PodResponse
from app.services.pod_service import PodService
from app.utils.auth import require_role, UserRole, CurrentUser

router = APIRouter(prefix="/pods", tags=["Pods"])


@router.get("", response_model=List[PodResponse])
def get_pods(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    pods = PodService.get_all(db, skip=skip, limit=limit, is_active=is_active)
    result = []
    for pod in pods:
        resp = PodResponse.model_validate(pod)
        resp.lead_name = pod.lead.full_name if pod.lead else None
        resp.member_count = len(pod.members)
        result.append(resp)
    return result


@router.post("", response_model=PodResponse, status_code=status.HTTP_201_CREATED)
def create_pod(data: PodCreate, db: Session = Depends(get_db)):
    pod = PodService.create(db, data)
    resp = PodResponse.model_validate(pod)
    resp.lead_name = pod.lead.full_name if pod.lead else None
    resp.member_count = len(pod.members)
    return resp


@router.get("/{pod_id}", response_model=PodResponse)
def get_pod(pod_id: int, db: Session = Depends(get_db)):
    pod = PodService.get_by_id(db, pod_id)
    resp = PodResponse.model_validate(pod)
    resp.lead_name = pod.lead.full_name if pod.lead else None
    resp.member_count = len(pod.members)
    return resp


@router.put("/{pod_id}", response_model=PodResponse)
def update_pod(pod_id: int, data: PodUpdate, db: Session = Depends(get_db)):
    pod = PodService.update(db, pod_id, data)
    resp = PodResponse.model_validate(pod)
    resp.lead_name = pod.lead.full_name if pod.lead else None
    resp.member_count = len(pod.members)
    return resp


@router.delete("/{pod_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pod(
    pod_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER))
):
    PodService.delete(db, pod_id)
    return None
