"""
Pydantic validation schemas package for API requests and responses.
"""

from app.schemas.analytics import (
    BureauStatItem,
    DashboardSummaryOut,
    MonthlyTrendItem,
)
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserCreateRequest,
    UserOut,
)
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintStatusUpdate,
    ComplaintUpdate,
)
from app.schemas.institution import (
    InstitutionComplaintItem,
    InstitutionDetailOut,
    InstitutionListResponse,
    InstitutionOut,
    InstitutionSummaryStats,
)
from app.schemas.overlap import (
    CaseOverlapOut,
    OverlapComplaintBrief,
    OverlapDetectRequest,
    OverlapDetectResponse,
    OverlapReviewRequest,
)

__all__ = [
    "ComplaintCreate",
    "ComplaintOut",
    "ComplaintStatusUpdate",
    "ComplaintUpdate",
    "BureauStatItem",
    "DashboardSummaryOut",
    "MonthlyTrendItem",
    "CaseOverlapOut",
    "OverlapComplaintBrief",
    "OverlapDetectRequest",
    "OverlapDetectResponse",
    "OverlapReviewRequest",
    "LoginRequest",
    "TokenResponse",
    "UserCreateRequest",
    "UserOut",
    "InstitutionComplaintItem",
    "InstitutionDetailOut",
    "InstitutionListResponse",
    "InstitutionOut",
    "InstitutionSummaryStats",
]
