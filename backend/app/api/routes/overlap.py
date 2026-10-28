from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/overlap", tags=["Case Overlap"])


@router.post("/detect")
async def detect_overlaps():
    """
    Feature 1: Smart Case Relationship & Overlap Detection
    Compare complaint text, institution identifiers, categories, and bureau information
    to suggest potentially duplicate or related cases.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Overlap detection engine will be implemented in Phase 2.",
    )


@router.get("/flagged")
async def get_flagged_overlaps():
    """
    Retrieve list of detected complaint pairs flagged for human review.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Flagged overlaps retrieval will be implemented in Phase 2.",
    )
