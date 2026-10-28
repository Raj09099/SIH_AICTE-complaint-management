"""
Authentication and User Pydantic response/request models for SIH26264 AICTE Complaint Intelligence.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials required to authenticate an AICTE officer or administrator."""
    email: str = Field(..., description="Official AICTE email address or username", min_length=3)
    password: str = Field(..., description="Account password", min_length=4)


class UserOut(BaseModel):
    """Public user identity representation."""
    id: int
    email: str
    full_name: str
    bureau: str
    role: str
    designation: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Bearer token payload returned upon successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreateRequest(BaseModel):
    """Payload to provision a new officer or admin account."""
    email: str
    password: str = Field(..., min_length=6)
    full_name: str
    bureau: str
    role: str = "officer"
    designation: Optional[str] = None

