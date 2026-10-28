"""
CaseOverlap ORM model for case_overlaps table in SIH26264 schema.
Feature 1: Relationship & Duplicate Detection.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
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
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.complaint import Complaint
    from app.models.user import User


class CaseOverlap(Base):
    __tablename__ = "case_overlaps"
    __table_args__ = (
        Index("idx_case_overlaps_pair", "primary_complaint_id", "related_complaint_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    primary_complaint_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    related_complaint_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    similarity_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 4), nullable=False
    )
    overlap_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="Semantic Duplicate",
        server_default=text("'Semantic Duplicate'"),
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    matching_keywords: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(Text), nullable=True
    )
    status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="Flagged",
        server_default=text("'Flagged'"),
    )
    reviewed_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
    )

    # Relationships
    primary_complaint: Mapped["Complaint"] = relationship(
        "Complaint",
        foreign_keys=[primary_complaint_id],
        back_populates="primary_overlaps",
    )
    related_complaint: Mapped["Complaint"] = relationship(
        "Complaint",
        foreign_keys=[related_complaint_id],
        back_populates="related_overlaps",
    )
    reviewer: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[reviewed_by],
        back_populates="reviewed_overlaps",
    )

