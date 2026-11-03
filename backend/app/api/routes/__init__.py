"""
API Route endpoints for AICTE Complaint Intelligence.
"""

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

__all__ = [
    "analytics",
    "auth",
    "complaints",
    "evidence",
    "institution_risk",
    "institutions",
    "notifications",
    "overlap",
    "patterns",
    "priority",
    "recurrence",
]
