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
    Automatically ensures sslmode=require for Supabase pooler connections.
    """
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if "pooler.supabase.com" in url:
        if "sslmode=" not in url:
            sep = "&" if "?" in url else "?"
            url = f"{url}{sep}sslmode=require"
    return url


db_url = get_database_url()
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 120,
    "echo": False,
}
if "postgresql" in db_url:
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "connect_args": {
            "connect_timeout": 15,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5,
        },
    })

engine: Engine = create_engine(db_url, **engine_kwargs)

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

