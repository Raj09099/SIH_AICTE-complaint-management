"""
Authentication API routes for SIH26264 AICTE Complaint Intelligence.
Handles officer sign-in, JWT token issuance, and profile validation.
"""

from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate officer and issue signed JWT access token",
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticates an AICTE bureau officer or administrator using official email/credentials.
    Enforces password-hash verification and active account status.
    Returns signed Bearer JWT token and user profile.
    """
    clean_email = credentials.email.strip().lower()
    user = (
        db.query(User)
        .filter(User.email.ilike(clean_email))
        .first()
    )

    if not user:
        logger.warning("Failed login attempt for non-existent account: %s", clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your official email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.hashed_password):
        logger.warning("Invalid password submitted for user ID %s (%s)", user.id, clean_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your official email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        logger.warning("Login rejected for deactivated account: %s", clean_email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This officer account is inactive. Please contact an AICTE system administrator.",
        )

    # Issue signed JWT access token
    access_token = create_access_token(
        subject=user.email,
        role=user.role or "officer",
        bureau=user.bureau,
    )

    user_out = UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        bureau=user.bureau,
        role=user.role or "officer",
        designation=user.designation,
        is_active=user.is_active if user.is_active is not None else True,
        created_at=user.created_at,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_out,
    )


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get profile of the currently authenticated AICTE officer",
)
def get_current_user_profile(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserOut:
    """
    Returns full profile information for the authenticated officer based on Bearer token.
    """
    email = current_user.get("email") or current_user.get("sub")
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return UserOut(
            id=current_user.get("id") or 0,
            email=email,
            full_name=current_user.get("name") or "Authorized Officer",
            bureau=current_user.get("bureau") or "General Grievance Cell",
            role=current_user.get("role") or "officer",
            designation=current_user.get("designation"),
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        bureau=user.bureau,
        role=user.role or "officer",
        designation=user.designation,
        is_active=user.is_active if user.is_active is not None else True,
        created_at=user.created_at,
    )
