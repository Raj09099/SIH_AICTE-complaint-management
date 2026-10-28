from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/patterns", tags=["Problem Patterns"])


@router.get("/")
async def list_problem_patterns():
    """
    Feature 2: Multi-Institution Problem Pattern Detector
    Group similar complaints from multiple institutions and identify recurring issues.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Problem pattern discovery service will be implemented in Phase 2.",
    )


@router.post("/run-clustering")
async def trigger_pattern_clustering():
    """
    Trigger unsupervised clustering pipeline across complaints.
    Implementation scheduled for Phase 2.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Clustering pipeline will be implemented in Phase 2.",
    )
