from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import (
    analytics,
    auth,
    complaints,
    evidence,
    institution_risk,
    institutions,
    notifications,
    overlap,
    patterns,
    priority,
    recurrence,
)
from app.core.scheduler import shutdown_scheduler, start_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup and shutdown events.
    """
    # Startup: start automated deadline monitoring scheduler (disabled during tests)
    is_testing = bool(os.environ.get("PYTEST_CURRENT_TEST") or os.environ.get("TESTING"))
    if not is_testing:
        start_scheduler()
    yield
    # Shutdown: cleanup
    if not is_testing:
        shutdown_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Lightweight health check endpoint for monitoring uptime and deployment status.
    """
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Include modular API v1 routers
api_prefix = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=api_prefix)
app.include_router(complaints.router, prefix=api_prefix)
app.include_router(institutions.router, prefix=api_prefix)
app.include_router(overlap.router, prefix=api_prefix)
app.include_router(patterns.router, prefix=api_prefix)
app.include_router(evidence.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(recurrence.router, prefix=api_prefix)
app.include_router(priority.router, prefix=api_prefix)
app.include_router(institution_risk.router, prefix=api_prefix)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "health": "/api/health",
        "docs": "/docs",
    }
