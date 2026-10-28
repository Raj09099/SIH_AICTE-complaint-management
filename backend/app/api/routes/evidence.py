from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/evidence", tags=["Evidence Checker"])


@router.post("/verify")
async def verify_resolution_evidence():
    """
    Feature 3: Resolution Evidence Checker
    Extract text from uploaded documents (PDF) and assess whether it appears relevant
    to the complaint and claimed resolution. Supports human review.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Evidence verification pipeline will be implemented in Phase 2.",
    )


@router.get("/complaint/{complaint_id}")
async def get_evidence_by_complaint(complaint_id: int):
    """
    Retrieve resolution evidence items and verification scores for a given complaint.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Evidence document retrieval will be implemented in Phase 2.",
    )
