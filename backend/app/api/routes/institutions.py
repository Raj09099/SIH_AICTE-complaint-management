from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/institutions", tags=["Institutions"])


@router.get("/")
async def list_institutions():
    """
    Search and filter AICTE approved technical institutions.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Institutions directory listing will be implemented in Phase 2.",
    )


@router.get("/{institution_id}")
async def get_institution_details(institution_id: int):
    """
    Fetch institution profile, complaints history, and bureau cases.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Institution details endpoint will be implemented in Phase 2.",
    )
