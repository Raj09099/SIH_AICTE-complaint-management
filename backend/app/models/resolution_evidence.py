"""
ResolutionEvidence ORM model for resolution_evidence table in SIH26264 schema.
Feature 3: Evidence Relevance Checker.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.complaint import Complaint
    from app.models.user import User


class ResolutionEvidence(Base):
    __tablename__ = "resolution_evidence"
    __table_args__ = (
        Index("idx_evidence_complaint_id", "complaint_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="application/pdf",
        server_default=text("'application/pdf'"),
    )
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    relevance_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    relevance_breakdown: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )
    human_verified: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
        default=False,
        server_default=text("false"),
    )
    reviewer_decision: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
    )

    # Relationships
    complaint: Mapped["Complaint"] = relationship(
        "Complaint",
        back_populates="evidences",
    )
    reviewer: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[reviewed_by],
        back_populates="reviewed_evidences",
    )

