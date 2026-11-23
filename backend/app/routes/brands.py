from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.brand import BrandCreate, BrandUpdate, BrandResponse
from app.services.brand_service import BrandService
from app.utils.auth import require_role, UserRole, CurrentUser

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.get("", response_model=List[BrandResponse])
def get_brands(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    brands = BrandService.get_all(db, skip=skip, limit=limit, is_active=is_active)
    result = []
    for b in brands:
        resp = BrandResponse.model_validate(b)
        resp.process_count = len(b.brand_processes)
        resp.assigned_employee_count = len(b.assignments)
        result.append(resp)
    return result


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(data: BrandCreate, db: Session = Depends(get_db)):
    brand = BrandService.create(db, data)
    resp = BrandResponse.model_validate(brand)
    resp.process_count = len(brand.brand_processes)
    resp.assigned_employee_count = len(brand.assignments)
    return resp


@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = BrandService.get_by_id(db, brand_id)
    resp = BrandResponse.model_validate(brand)
    resp.process_count = len(brand.brand_processes)
    resp.assigned_employee_count = len(brand.assignments)
    return resp


@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, data: BrandUpdate, db: Session = Depends(get_db)):
    brand = BrandService.update(db, brand_id, data)
    resp = BrandResponse.model_validate(brand)
    resp.process_count = len(brand.brand_processes)
    resp.assigned_employee_count = len(brand.assignments)
    return resp


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role(UserRole.OPERATIONS_MANAGER))
):
    BrandService.delete(db, brand_id)
    return None
