"""
Complaint ORM model for complaints table in SIH26264 schema.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.case_overlap import CaseOverlap
    from app.models.institution import Institution
    from app.models.resolution_evidence import ResolutionEvidence
    from app.models.user import User


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        Index("idx_complaints_no", "complaint_no"),
        Index("idx_complaints_institution_id", "institution_id"),
        Index("idx_complaints_bureau", "bureau"),
        Index("idx_complaints_status", "status"),
        Index("idx_complaints_category", "category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    complainant_type: Mapped[str] = mapped_column(String(50), nullable=False)
    bureau: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="Medium",
        server_default=text("'Medium'"),
    )
    status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="New",
        server_default=text("'New'"),
    )
    incident_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    filing_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
        server_default=func.current_date(),
    )
    deadline_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    assigned_to: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolution_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_escalated: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
        default=False,
        server_default=text("false"),
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
    institution: Mapped["Institution"] = relationship(
        "Institution",
        back_populates="complaints",
    )
    assignee: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="assigned_complaints",
        foreign_keys=[assigned_to],
    )
    primary_overlaps: Mapped[List["CaseOverlap"]] = relationship(
        "CaseOverlap",
        foreign_keys="CaseOverlap.primary_complaint_id",
        back_populates="primary_complaint",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    related_overlaps: Mapped[List["CaseOverlap"]] = relationship(
        "CaseOverlap",
        foreign_keys="CaseOverlap.related_complaint_id",
        back_populates="related_complaint",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    evidences: Mapped[List["ResolutionEvidence"]] = relationship(
        "ResolutionEvidence",
        back_populates="complaint",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

