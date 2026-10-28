"""
ProblemPattern ORM model for problem_patterns table in SIH26264 schema.
Feature 2: Multi-Institution Pattern Detector.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import (
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ProblemPattern(Base):
    __tablename__ = "problem_patterns"
    __table_args__ = (
        Index("idx_patterns_category", "category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pattern_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    bureau: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    affected_institutions_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=1,
        server_default=text("1"),
    )
    complaint_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        default=1,
        server_default=text("1"),
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sample_complaint_ids: Mapped[Optional[List[int]]] = mapped_column(
        ARRAY(Integer), nullable=True
    )
    cluster_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4), nullable=True
    )
    status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="Active",
        server_default=text("'Active'"),
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

