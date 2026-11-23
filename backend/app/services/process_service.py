from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.process import Process
from app.schemas.process import ProcessCreate, ProcessUpdate


class ProcessService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None) -> List[Process]:
        stmt = select(Process)
        if is_active is not None:
            stmt = stmt.where(Process.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, process_id: int) -> Process:
        proc = db.get(Process, process_id)
        if not proc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Process with id {process_id} not found")
        return proc

    @staticmethod
    def create(db: Session, data: ProcessCreate) -> Process:
        if db.scalar(select(Process).where(Process.name == data.name)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Process '{data.name}' already exists")
        if db.scalar(select(Process).where(Process.code == data.code)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Process code '{data.code}' already exists")

        proc = Process(**data.model_dump())
        db.add(proc)
        db.commit()
        db.refresh(proc)
        return proc

    @staticmethod
    def update(db: Session, process_id: int, data: ProcessUpdate) -> Process:
        proc = ProcessService.get_by_id(db, process_id)
        update_data = data.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != proc.name:
            if db.scalar(select(Process).where(Process.name == update_data["name"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Process name already in use")

        if "code" in update_data and update_data["code"] != proc.code:
            if db.scalar(select(Process).where(Process.code == update_data["code"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Process code already in use")

        for field, value in update_data.items():
            setattr(proc, field, value)

        db.commit()
        db.refresh(proc)
        return proc

    @staticmethod
    def delete(db: Session, process_id: int) -> None:
        proc = ProcessService.get_by_id(db, process_id)
        db.delete(proc)
        db.commit()
