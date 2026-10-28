"""
SQLAlchemy 2.x Database configuration and session management for SIH26264.
Provides engine, SessionLocal, and declarative Base matching PostgreSQL schema.
"""

from typing import Union
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings


def get_database_url() -> str:
    """
    Retrieve and format the database connection URL from application settings.
    Ensures compatibility with SQLAlchemy PostgreSQL dialect format
    (e.g., handles postgres:// vs postgresql://).
    """
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


# Engine initialization with connection pooling and health checks.
# Note: Connection is established lazily on first query/session operation,
# so importing the engine does not require an active database connection.
engine: Engine = create_engine(
    get_database_url(),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

# Session factory bound to the engine
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """
    SQLAlchemy 2.x declarative Base for all ORM models.
    """
    pass

