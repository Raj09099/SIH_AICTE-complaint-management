"""
Analytics and telemetry API routes for SIH26264 AICTE Complaint Intelligence.
"""

from datetime import date
import logging
from typing import Dict, List, Tuple
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy import func, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.case_overlap import CaseOverlap
from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.problem_pattern import ProblemPattern
from app.models.resolution_evidence import ResolutionEvidence
from app.schemas.analytics import BureauStatItem, DashboardSummaryOut, MonthlyTrendItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

MONTH_NAMES = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
]


def _build_bureau_stats(db: Session) -> List[BureauStatItem]:
    """Helper to aggregate per-bureau workload and SLA resolution rates."""
    bureau_rows = (
        db.query(Complaint.bureau, Complaint.status, func.count(Complaint.id))
        .group_by(Complaint.bureau, Complaint.status)
        .all()
    )

    bureau_map: Dict[str, Dict[str, int]] = {}
    for bureau, status_val, cnt in bureau_rows:
        bureau_name = bureau or "Unassigned Bureau"
        if bureau_name not in bureau_map:
            bureau_map[bureau_name] = {"active": 0, "resolved": 0, "total": 0}
        bureau_map[bureau_name]["total"] += cnt
        if status_val == "Resolved":
            bureau_map[bureau_name]["resolved"] += cnt
        else:
            bureau_map[bureau_name]["active"] += cnt

    items: List[BureauStatItem] = []
    for name, data in bureau_map.items():
        tot = data["total"]
        res = data["resolved"]
        act = data["active"]
        rate = round((res / tot) * 100, 1) if tot > 0 else 0.0
        items.append(
            BureauStatItem(
                name=name,
                active=act,
                resolved=res,
                total=tot,
                slaOnTime=rate,
            )
        )
    items.sort(key=lambda x: x.total, reverse=True)
    return items


def _build_monthly_trends(db: Session) -> List[MonthlyTrendItem]:
    """Helper to aggregate monthly inflow and resolution velocity."""
    inflow_rows = (
        db.query(
            func.extract("year", Complaint.filing_date).label("year_num"),
            func.extract("month", Complaint.filing_date).label("month_num"),
            func.count(Complaint.id),
        )
        .filter(Complaint.filing_date.isnot(None))
        .group_by("year_num", "month_num")
        .order_by("year_num", "month_num")
        .all()
    )

    resolved_rows = (
        db.query(
            func.extract("year", Complaint.filing_date).label("year_num"),
            func.extract("month", Complaint.filing_date).label("month_num"),
            func.count(Complaint.id),
        )
        .filter(
            Complaint.filing_date.isnot(None),
            Complaint.status == "Resolved",
        )
        .group_by("year_num", "month_num")
        .order_by("year_num", "month_num")
        .all()
    )

    inflow_dict: Dict[Tuple[int, int], int] = {
        (int(r[0]), int(r[1])): r[2]
        for r in inflow_rows
        if r[0] is not None and r[1] is not None
    }
    resolved_dict: Dict[Tuple[int, int], int] = {
        (int(r[0]), int(r[1])): r[2]
        for r in resolved_rows
        if r[0] is not None and r[1] is not None
    }

    all_keys = sorted(set(inflow_dict.keys()) | set(resolved_dict.keys()))
    monthly_trends: List[MonthlyTrendItem] = []
    for _year, m_num in all_keys:
        if 1 <= m_num <= 12:
            monthly_trends.append(
                MonthlyTrendItem(
                    month=MONTH_NAMES[m_num],
                    received=inflow_dict.get((_year, m_num), 0),
                    resolved=resolved_dict.get((_year, m_num), 0),
                    overlaps=0,
                )
            )
    return monthly_trends


@router.get(
    "/summary",
    response_model=DashboardSummaryOut,
    summary="Get aggregated institutional dashboard telemetry",
)
def get_dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummaryOut:
    """
    Returns aggregated dashboard statistics calculated directly from the live database:
    - Complaint volume, active vs resolved, escalated, and overdue counts
    - Registered institution count
    - Council-wide SLA compliance percentage
    - Honest AI engine metrics from case overlaps, problem patterns, and evidence records
    - Monthly inflow/resolution trends and bureau workload distribution
    """
    try:
        total_complaints = db.query(func.count(Complaint.id)).scalar() or 0
        total_institutions = db.query(func.count(Institution.id)).scalar() or 0

        # Status distribution
        status_rows = (
            db.query(Complaint.status, func.count(Complaint.id))
            .group_by(Complaint.status)
            .all()
        )
        status_distribution = {
            row[0] or "Unknown": row[1] for row in status_rows
        }
        resolved_complaints = status_distribution.get("Resolved", 0)
        active_complaints = sum(
            cnt for st, cnt in status_distribution.items() if st != "Resolved"
        )

        # Priority distribution
        priority_rows = (
            db.query(Complaint.priority, func.count(Complaint.id))
            .group_by(Complaint.priority)
            .all()
        )
        priority_distribution = {
            row[0] or "Medium": row[1] for row in priority_rows
        }

        # Escalated complaints
        escalated_complaints = (
            db.query(func.count(Complaint.id))
            .filter(Complaint.is_escalated.is_(True))
            .scalar()
            or 0
        )

        # Overdue complaints
        today = date.today()
        overdue_complaints = (
            db.query(func.count(Complaint.id))
            .filter(
                Complaint.status != "Resolved",
                Complaint.deadline_date.isnot(None),
                Complaint.deadline_date < today,
            )
            .scalar()
            or 0
        )

        # Council SLA compliance rate
        if total_complaints > 0:
            compliant_count = max(0, total_complaints - overdue_complaints)
            sla_compliance_rate = round((compliant_count / total_complaints) * 100, 1)
        else:
            sla_compliance_rate = 0.0

        # AI Engine counts (safe against unpopulated or lightweight test schemas)
        total_overlaps = 0
        high_confidence_overlaps = 0
        total_patterns = 0
        institutions_affected_by_patterns = 0
        evidence_total = 0
        evidence_verified_count = 0
        evidence_verification_rate = 0.0

        inspector = inspect(db.get_bind())

        if inspector.has_table("case_overlaps"):
            try:
                total_overlaps = db.query(func.count(CaseOverlap.id)).scalar() or 0
                if total_overlaps > 0:
                    high_confidence_overlaps = (
                        db.query(func.count(CaseOverlap.id))
                        .filter(CaseOverlap.similarity_score >= 0.85)
                        .scalar()
                        or 0
                    )
            except Exception as overlap_err:
                logger.debug("CaseOverlap table query omitted: %s", overlap_err)

        if inspector.has_table("problem_patterns"):
            try:
                total_patterns = db.query(func.count(ProblemPattern.id)).scalar() or 0
            except Exception as pattern_err:
                logger.debug("ProblemPattern table query omitted: %s", pattern_err)

        if inspector.has_table("resolution_evidence"):
            try:
                evidence_total = db.query(func.count(ResolutionEvidence.id)).scalar() or 0
                if evidence_total > 0:
                    evidence_verified_count = (
                        db.query(func.count(ResolutionEvidence.id))
                        .filter(ResolutionEvidence.verification_status == "Verified")
                        .scalar()
                        or 0
                    )
                    evidence_verification_rate = round(
                        (evidence_verified_count / evidence_total) * 100, 1
                    )
            except Exception as evidence_err:
                logger.debug("ResolutionEvidence table query omitted: %s", evidence_err)

        # Inflow trends & bureau distribution
        monthly_trends = _build_monthly_trends(db)
        bureau_distribution = _build_bureau_stats(db)

        return DashboardSummaryOut(
            total_complaints=total_complaints,
            active_complaints=active_complaints,
            resolved_complaints=resolved_complaints,
            escalated_complaints=escalated_complaints,
            overdue_complaints=overdue_complaints,
            total_institutions=total_institutions,
            sla_compliance_rate=sla_compliance_rate,
            total_overlaps=total_overlaps,
            high_confidence_overlaps=high_confidence_overlaps,
            total_patterns=total_patterns,
            institutions_affected_by_patterns=institutions_affected_by_patterns,
            evidence_total=evidence_total,
            evidence_verified_count=evidence_verified_count,
            evidence_verification_rate=evidence_verification_rate,
            monthly_trends=monthly_trends,
            bureau_distribution=bureau_distribution,
            status_distribution=status_distribution,
            priority_distribution=priority_distribution,
        )

    except SQLAlchemyError as err:
        logger.error("Database error while computing dashboard summary: %s", err)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute analytics dashboard summary due to an internal database error.",
        )


@router.get(
    "/bureau-breakdown",
    response_model=List[BureauStatItem],
    summary="Get cross-bureau complaint distribution and resolution rates",
)
def get_bureau_breakdown(db: Session = Depends(get_db)) -> List[BureauStatItem]:
    """
    Returns per-bureau grievance distribution, active caseloads, and resolution stats.
    """
    try:
        return _build_bureau_stats(db)
    except SQLAlchemyError as err:
        logger.error("Database error while computing bureau breakdown: %s", err)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute bureau breakdown analytics due to an internal database error.",
        )
