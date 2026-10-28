"""
API Route endpoints for AICTE Complaint Intelligence.
"""

from app.api.routes import (
    analytics,
    auth,
    complaints,
    evidence,
    institutions,
    overlap,
    patterns,
)

__all__ = [
    "analytics",
    "auth",
    "complaints",
    "evidence",
    "institutions",
    "overlap",
    "patterns",
]
