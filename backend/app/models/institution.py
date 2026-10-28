"""
Institution ORM model for institutions table in SIH26264 schema.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Index, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.complaint import Complaint


class Institution(Base):
    __tablename__ = "institutions"
    __table_args__ = (
        Index("idx_institutions_aicte_id", "aicte_id"),
        Index("idx_institutions_state", "state"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    aicte_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    institution_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="Technical Institute",
        server_default=text("'Technical Institute'"),
    )
    affiliating_university: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    established_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bureau_jurisdiction: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
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
    complaints: Mapped[List["Complaint"]] = relationship(
        "Complaint",
        back_populates="institution",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

