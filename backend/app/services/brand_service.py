from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.brand import Brand
from app.schemas.brand import BrandCreate, BrandUpdate


class BrandService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, is_active: Optional[bool] = None) -> List[Brand]:
        stmt = select(Brand)
        if is_active is not None:
            stmt = stmt.where(Brand.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_by_id(db: Session, brand_id: int) -> Brand:
        brand = db.get(Brand, brand_id)
        if not brand:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Brand with id {brand_id} not found")
        return brand

    @staticmethod
    def create(db: Session, data: BrandCreate) -> Brand:
        if db.scalar(select(Brand).where(Brand.name == data.name)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Brand '{data.name}' already exists")
        if db.scalar(select(Brand).where(Brand.code == data.code)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Brand code '{data.code}' already exists")

        brand = Brand(**data.model_dump())
        db.add(brand)
        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def update(db: Session, brand_id: int, data: BrandUpdate) -> Brand:
        brand = BrandService.get_by_id(db, brand_id)
        update_data = data.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != brand.name:
            if db.scalar(select(Brand).where(Brand.name == update_data["name"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand name already in use")

        if "code" in update_data and update_data["code"] != brand.code:
            if db.scalar(select(Brand).where(Brand.code == update_data["code"])):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand code already in use")

        for field, value in update_data.items():
            setattr(brand, field, value)

        db.commit()
        db.refresh(brand)
        return brand

    @staticmethod
    def delete(db: Session, brand_id: int) -> None:
        brand = BrandService.get_by_id(db, brand_id)
        db.delete(brand)
        db.commit()
