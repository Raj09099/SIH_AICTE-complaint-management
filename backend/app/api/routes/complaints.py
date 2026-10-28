from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/complaints", tags=["Complaints"])


@router.get("/")
async def list_complaints():
    """
    List complaints with filters (bureau, status, institution, date range).
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Complaint listing endpoint will be implemented in Phase 2.",
    )


@router.post("/")
async def create_complaint():
    """
    Create a new complaint record.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Complaint creation endpoint will be implemented in Phase 2.",
    )


@router.get("/{complaint_id}")
async def get_complaint_details(complaint_id: int):
    """
    Fetch complaint details by ID.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Complaint details endpoint will be implemented in Phase 2.",
    )


@router.patch("/{complaint_id}/status")
async def update_complaint_status(complaint_id: int):
    """
    Update complaint lifecycle status.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Status update endpoint will be implemented in Phase 2.",
    )
