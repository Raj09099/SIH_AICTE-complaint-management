from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary")
async def get_dashboard_summary():
    """
    Overview statistics: total complaints, pending, resolved, overdue, and bureau breakdown.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Analytics summary endpoint will be implemented in Phase 2.",
    )


@router.get("/bureau-breakdown")
async def get_bureau_breakdown():
    """
    Cross-bureau complaint distribution and resolution rates.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Bureau breakdown analytics will be implemented in Phase 2.",
    )
