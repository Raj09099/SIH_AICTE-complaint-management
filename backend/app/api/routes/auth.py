from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login")
async def login():
    """
    Officer authentication endpoint.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication logic will be implemented in Phase 2.",
    )


@router.get("/me")
async def get_current_user_profile():
    """
    Get profile of the authenticated AICTE officer.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="User profile logic will be implemented in Phase 2.",
    )
