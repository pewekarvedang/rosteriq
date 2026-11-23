from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.pod import Pod
from app.models.employee import Employee
from app.schemas.pod import PodCreate, PodUpdate


class PodService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None) -> List[Pod]:
        stmt = select(Pod)
        if is_active is not None:
            stmt = stmt.where(Pod.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, pod_id: int) -> Pod:
        pod = db.get(Pod, pod_id)
        if not pod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pod with id {pod_id} not found"
            )
        return pod

    @staticmethod
    def create(db: Session, data: PodCreate) -> Pod:
        # Check uniqueness of name and code
        if db.scalar(select(Pod).where(Pod.name == data.name)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Pod name '{data.name}' already exists")
        if db.scalar(select(Pod).where(Pod.code == data.code)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Pod code '{data.code}' already exists")

        if data.lead_id is not None:
            lead = db.get(Employee, data.lead_id)
            if not lead:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Designated lead employee {data.lead_id} does not exist")

        pod = Pod(**data.model_dump())
        db.add(pod)
        db.commit()
        db.refresh(pod)
        return pod

    @staticmethod
    def update(db: Session, pod_id: int, data: PodUpdate) -> Pod:
        pod = PodService.get_by_id(db, pod_id)
        update_data = data.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != pod.name:
            if db.scalar(select(Pod).where(Pod.name == update_data["name"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pod name already in use")

        if "code" in update_data and update_data["code"] != pod.code:
            if db.scalar(select(Pod).where(Pod.code == update_data["code"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pod code already in use")

        if "lead_id" in update_data and update_data["lead_id"] is not None:
            lead = db.get(Employee, update_data["lead_id"])
            if not lead:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Lead employee {update_data['lead_id']} not found")

        for field, value in update_data.items():
            setattr(pod, field, value)

        db.commit()
        db.refresh(pod)
        return pod

    @staticmethod
    def delete(db: Session, pod_id: int) -> None:
        pod = PodService.get_by_id(db, pod_id)
        db.delete(pod)
        db.commit()
