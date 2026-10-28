"""
User ORM model for users table in SIH26264 schema (AICTE Bureau Officers & Admins).
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Index, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.case_overlap import CaseOverlap
    from app.models.complaint import Complaint
    from app.models.resolution_evidence import ResolutionEvidence


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_bureau", "bureau"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    bureau: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="officer",
        server_default=text("'officer'"),
    )
    designation: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    is_active: Mapped[Optional[bool]] = mapped_column(
        Boolean, nullable=True, default=True, server_default=text("true")
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    assigned_complaints: Mapped[List["Complaint"]] = relationship(
        "Complaint",
        back_populates="assignee",
        foreign_keys="Complaint.assigned_to",
    )
    reviewed_overlaps: Mapped[List["CaseOverlap"]] = relationship(
        "CaseOverlap",
        back_populates="reviewer",
        foreign_keys="CaseOverlap.reviewed_by",
    )
    reviewed_evidences: Mapped[List["ResolutionEvidence"]] = relationship(
        "ResolutionEvidence",
        back_populates="reviewer",
        foreign_keys="ResolutionEvidence.reviewed_by",
    )

