from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.brand_process import BrandProcess
from app.models.brand import Brand
from app.models.process import Process
from app.schemas.brand_process import BrandProcessCreate, BrandProcessUpdate


class BrandProcessService:
    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        brand_id: Optional[int] = None,
        process_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> List[BrandProcess]:
        stmt = select(BrandProcess)
        if brand_id is not None:
            stmt = stmt.where(BrandProcess.brand_id == brand_id)
        if process_id is not None:
            stmt = stmt.where(BrandProcess.process_id == process_id)
        if is_active is not None:
            stmt = stmt.where(BrandProcess.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, bp_id: int) -> BrandProcess:
        bp = db.get(BrandProcess, bp_id)
        if not bp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"BrandProcess with id {bp_id} not found")
        return bp

    @staticmethod
    def create(db: Session, data: BrandProcessCreate) -> BrandProcess:
        # Check Brand and Process existence
        if not db.get(Brand, data.brand_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Brand {data.brand_id} not found")
        if not db.get(Process, data.process_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Process {data.process_id} not found")

        # Check existing pair
        existing = db.scalar(
            select(BrandProcess).where(
                BrandProcess.brand_id == data.brand_id,
                BrandProcess.process_id == data.process_id
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This Process is already associated with this Brand"
            )

        bp = BrandProcess(**data.model_dump())
        db.add(bp)
        db.commit()
        db.refresh(bp)
        return bp

    @staticmethod
    def update(db: Session, bp_id: int, data: BrandProcessUpdate) -> BrandProcess:
        bp = BrandProcessService.get_by_id(db, bp_id)
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(bp, field, value)

        db.commit()
        db.refresh(bp)
        return bp

    @staticmethod
    def delete(db: Session, bp_id: int) -> None:
        bp = BrandProcessService.get_by_id(db, bp_id)
        db.delete(bp)
        db.commit()
