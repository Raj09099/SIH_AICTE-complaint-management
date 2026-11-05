"""
Institutional Compliance and Document ORM models for SIH26264 schema.
Feature 3.3 (Institute Portal): Institution-Specific Compliance Management.
Enforces strict institution_id scoping for statutory requirements, deadlines, and submissions.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
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
    from app.models.institution import Institution
    from app.models.user import User


class InstitutionalCompliance(Base):
    __tablename__ = "institutional_compliances"
    __table_args__ = (
        Index("idx_inst_compliance_inst_id", "institution_id"),
        Index("idx_inst_compliance_due_date", "due_date"),
        Index("idx_inst_compliance_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    requirement_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Pending", server_default=text("'Pending'")
    )  # 'Pending', 'Completed', 'Overdue', 'Requires Action'
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False, default="High", server_default=text("'High'")
    )  # 'Urgent', 'High', 'Medium', 'Standard'
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
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
        backref="compliances",
    )
    documents: Mapped[List["ComplianceDocument"]] = relationship(
        "ComplianceDocument",
        back_populates="compliance",
        cascade="all, delete-orphan",
        order_by="ComplianceDocument.submitted_at.desc()",
    )


class ComplianceDocument(Base):
    __tablename__ = "compliance_documents"
    __table_args__ = (
        Index("idx_comp_docs_comp_id", "compliance_id"),
        Index("idx_comp_docs_inst_id", "institution_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    compliance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutional_compliances.id", ondelete="CASCADE"), nullable=False
    )
    institution_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )
    verification_status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Verified", server_default=text("'Verified'")
    )  # 'Submitted', 'Verified', 'Under Review', 'Requires Revision'

    # Relationships
    compliance: Mapped["InstitutionalCompliance"] = relationship(
        "InstitutionalCompliance",
        back_populates="documents",
    )
    submitter: Mapped[Optional["User"]] = relationship("User")

