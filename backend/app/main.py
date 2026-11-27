import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.config import settings
from app.database import init_db, check_db_connection, SessionLocal
from app.utils.seed_data import seed_database
from app.routes import api_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("rosteriq")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database schema is ready and seed initial data
    logger.info("Initializing RosterIQ database...")
    init_db()
    try:
        with SessionLocal() as db:
            seed_database(db)
        logger.info("RosterIQ database initialized and sample data seeded successfully.")
    except Exception as exc:
        logger.warning(f"Database seed notice: {exc}")
    yield
    # Shutdown cleanup
    logger.info("Shutting down RosterIQ backend.")


app = FastAPI(
    title="RosterIQ - Smart Roster Management System",
    description=(
        "Production-ready backend API foundation for RosterIQ. "
        "Provides modular management of Employees, Operational Pods, D2C Brands, "
        "Processes, Operating Calendars, Availability, Shifts, Rostering, and Conflict Detection."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error(f"Database integrity violation at {request.url}: {exc.orig}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error_type": "DatabaseIntegrityError",
            "message": "Database constraint violation (unique or foreign key conflict)",
            "detail": str(exc.orig) if exc.orig else "Integrity constraint failure",
        }
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error at {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error_type": "DatabaseError",
            "message": "A database operational error occurred. Please try again or check logs.",
            "detail": str(exc) if settings.DEBUG else None,
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error at {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "ValidationError",
            "message": "Invalid request parameters",
            "errors": exc.errors(),
        }
    )


# Include API routes under prefix (e.g. /api/v1)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health & Meta"])
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health & Meta"])
def health_check():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "RosterIQ API",
        "database": "connected" if db_ok else "unreachable",
    }


# Static Frontend SPA serving for production deployment / Standalone Desktop Application
FRONTEND_DIST = os.path.abspath(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend",
        "dist"
    )
)

if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Allow API routes, Swagger UI, ReDoc, and health check to pass through
        clean_path = full_path.lstrip("/")
        if (
            clean_path.startswith("api")
            or clean_path.startswith("docs")
            or clean_path.startswith("redoc")
            or clean_path == "openapi.json"
            or clean_path == "health"
        ):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(FRONTEND_DIST, clean_path)
        if clean_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/", tags=["Health & Meta"])
    def root_status():
        return {
            "app": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "version": "1.0.0",
            "status": "online",
            "docs_url": "/docs",
            "api_v1": settings.API_V1_PREFIX,
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=settings.DEBUG)
