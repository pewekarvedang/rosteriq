from fastapi import APIRouter
from app.routes.employees import router as employees_router
from app.routes.pods import router as pods_router
from app.routes.brands import router as brands_router
from app.routes.processes import router as processes_router
from app.routes.brand_processes import router as brand_processes_router
from app.routes.employee_assignments import router as employee_assignments_router
from app.routes.employee_availability import router as employee_availability_router
from app.routes.public_holidays import router as public_holidays_router
from app.routes.shifts import router as shifts_router
from app.routes.rosters import router as rosters_router
from app.routes.conflicts import router as conflicts_router
from app.routes.auth import router as auth_router

api_router = APIRouter()

api_router.include_router(employees_router)
api_router.include_router(pods_router)
api_router.include_router(brands_router)
api_router.include_router(processes_router)
api_router.include_router(brand_processes_router)
api_router.include_router(employee_assignments_router)
api_router.include_router(employee_availability_router)
api_router.include_router(public_holidays_router)
api_router.include_router(shifts_router)
api_router.include_router(rosters_router)
api_router.include_router(conflicts_router)
api_router.include_router(auth_router)

__all__ = ["api_router"]
