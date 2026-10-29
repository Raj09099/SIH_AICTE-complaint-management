"""
FastAPI Dependency injection providers for database sessions and authentication.
"""

from typing import Generator, List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.user import User

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
    db: Session = Depends(get_db),
) -> Optional[dict]:
    """
    Extracts and validates the current user from the Bearer token.
    Returns None if no token is provided (for optional auth routes),
    or raises 401 if token is invalid/expired.
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: Optional[str] = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This user account has been deactivated. Please contact an AICTE administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "sub": user.email,
        "email": user.email,
        "name": user.full_name,
        "role": user.role or "officer",
        "bureau": user.bureau,
        "designation": user.designation,
        "id": user.id,
    }


async def get_current_active_user(
    current_user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """Enforces that the request has a valid, active authenticated officer session."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with your official credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def require_roles(*allowed_roles: str):
    """Factory dependency that restricts access to specific authorized user roles."""
    async def role_checker(
        user: dict = Depends(get_current_active_user),
    ) -> dict:
        user_role = (user.get("role") or "").lower()
        normalized_allowed = [r.lower() for r in allowed_roles]
        if user_role not in normalized_allowed and "admin" not in user_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of the following roles: {', '.join(allowed_roles)}.",
            )
        return user
    return role_checker


# Predefined authorized officer dependency for state-mutating operations
require_officer = require_roles("admin", "bureau_head", "officer")
