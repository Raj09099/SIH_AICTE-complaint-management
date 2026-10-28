"""
FastAPI Dependency injection providers for database sessions and authentication.
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/login",
    auto_error=False,
)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency provider.
    Yields a database session and guarantees closure upon request completion.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[dict]:
    """
    Stub authentication dependency to be implemented in Phase 2.
    """
    if not token:
        return None
    # Token validation logic will be integrated in Phase 2
    return {"sub": "officer@aicte-india.org", "role": "officer"}
