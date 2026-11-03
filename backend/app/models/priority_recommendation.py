"""
Priority Recommendation ORM model for priority_recommendations table in SIH26264 schema.
Handles Feature 3.5: AI-Assisted Priority System.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.complaint import Complaint
    from app.models.user import User


class PriorityRecommendation(Base):
    __tablename__ = "priority_recommendations"
    __table_args__ = (
        Index("idx_priority_rec_complaint", "complaint_id"),
        Index("idx_priority_rec_status", "status"),
        Index("idx_priority_rec_priority", "recommended_priority"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    complaint_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False
    )
    recommended_priority: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'Critical', 'High', 'Medium', 'Low'
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 to 100
    factors: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="Pending Review",
        server_default=text("'Pending Review'"),
    )  # 'Pending Review', 'Accepted', 'Overridden'
    initial_priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    final_priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    decision_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_by: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
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
    complaint: Mapped["Complaint"] = relationship(
        "Complaint",
        back_populates="priority_recommendations",
    )
    decider: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="priority_decisions",
        foreign_keys=[decided_by],
    )

