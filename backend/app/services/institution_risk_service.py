"""
Institution Risk Analysis Service for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3.7:
- Multi-factor transparent institution concern scoring (0-100 pts)
- Indicator classification: High Concern, Moderate Concern, Low Concern, Insufficient Data
- Reuses Recurrence Radar (3.4), AI Priority (3.5), and Deadline Monitoring (3.3)
- Generates explainable, evidence-backed attention-support telemetry
- Strictly enforces non-judgmental advisory disclaimers
- Enforces role-based isolation (Officers council-wide vs Institutes own campus)
"""

from collections import defaultdict
from datetime import date, datetime
import logging
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.institution_risk import (
    InstitutionRiskDetailResponse,
    InstitutionRiskItem,
    InstitutionRiskOverviewResponse,
    MonthlyRiskTrendPoint,
    RecurringCategoryStat,
    RiskComplaintSummary,
    RiskScoringFactors,
)
from app.services.recurrence_service import RecurrenceService

logger = logging.getLogger(__name__)


class InstitutionRiskService:
    """Service encapsulating institution-level concern indicator calculation and risk telemetry."""

    DISCLAIMER_TEXT = (
        "Institution Concern Indicator is an analytical attention-support signal based on available "
        "complaint data. It is not an institutional quality rating, proof of wrongdoing or automatic "
        "finding against any institution. All findings require authorized human review."
    )

    DATA_LIMITATIONS_TEXT = (
        "Student enrollment and campus intake capacity data are not currently recorded in the AICTE "
        "schema. Complaint volume is evaluated against council-wide distribution rather than "
        "per-capita student density. Indicators reflect grievance administrative patterns only."
    )

    @classmethod
    def calculate_institution_risk(
        cls,
        institution: Institution,
        complaints: List[Complaint],
        reference_date: Optional[date] = None,
    ) -> Tuple[int, str, RiskScoringFactors, str]:
        """
        Calculates the transparent multi-factor concern score (0-100), concern level indicator,
        granular factor contributions, and factual human-readable explanation.
        """
        today = reference_date or date.today()
        total_count = len(complaints)

        # 1. Insufficient Data Handling (0 or 1 complaint is not enough historical pattern)
        if total_count == 0:
            factors = RiskScoringFactors(
                volume_score=0,
                volume_count=0,
                recurrence_score=0,
                recurring_count=0,
                recurring_categories_count=0,
                growth_score=0,
                growth_trend="Insufficient Data",
                priority_score=0,
                high_critical_count=0,
                overdue_score=0,
                overdue_count=0,
                total_score=0,
            )
            return (
                0,
                "Insufficient Data",
                factors,
                "No registered complaints found for this institution; insufficient data to calculate risk.",
            )

        if total_count == 1:
            c = complaints[0]
            is_overdue = (
                c.status != "Resolved"
                and c.deadline_date is not None
                and c.deadline_date < today
            )
            is_high_p = (c.priority or "").strip().capitalize() in ("Critical", "High", "Urgent")
            factors = RiskScoringFactors(
                volume_score=3,
                volume_count=1,
                recurrence_score=0,
                recurring_count=0,
                recurring_categories_count=0,
                growth_score=0,
                growth_trend="Insufficient Data",
                priority_score=6 if is_high_p else 0,
                high_critical_count=1 if is_high_p else 0,
                overdue_score=5 if is_overdue else 0,
                overdue_count=1 if is_overdue else 0,
                total_score=3 + (6 if is_high_p else 0) + (5 if is_overdue else 0),
            )
            return (
                factors.total_score,
                "Insufficient Data",
                factors,
                "Single isolated complaint recorded; insufficient temporal data to establish an institutional concern pattern.",
            )

        # Factor A: Total Complaint Volume (0-20 pts)
        if total_count >= 11:
            volume_score = 20
        elif total_count >= 6:
            volume_score = 14
        elif total_count >= 3:
            volume_score = 8
        else:
            volume_score = 4

        # Factor B: Recurring Complaints (0-25 pts)
        category_map: Dict[str, List[Complaint]] = defaultdict(list)
        monthly_counts: Dict[str, int] = defaultdict(int)
        for c in complaints:
            category_map[c.category].append(c)
            m_str = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
            monthly_counts[m_str] += 1

        recurring_complaints_count = 0
        recurring_categories_count = 0
        primary_recurring_category = None
        max_cat_count = 0

        for cat_name, c_list in category_map.items():
            if len(c_list) >= 2:
                recurring_complaints_count += len(c_list)
                recurring_categories_count += 1
                if len(c_list) > max_cat_count:
                    max_cat_count = len(c_list)
                    primary_recurring_category = cat_name

        if recurring_complaints_count >= 7 or recurring_categories_count >= 3:
            recurrence_score = 25
        elif recurring_complaints_count >= 4 or recurring_categories_count >= 2:
            recurrence_score = 16
        elif recurring_complaints_count >= 2:
            recurrence_score = 8
        else:
            recurrence_score = 0

        # Factor C: Complaint Growth Trend (0-20 pts)
        growth_trend = RecurrenceService.classify_trend(monthly_counts)
        if growth_trend == "Increasing":
            growth_score = 20
        elif growth_trend == "Stable":
            growth_score = 8
        elif growth_trend == "Decreasing":
            growth_score = 2
        else:
            growth_score = 0

        # Factor D: High and Critical Priority Complaints (0-20 pts)
        high_critical_count = sum(
            1
            for c in complaints
            if (c.status != "Resolved")
            and ((c.priority or "").strip().capitalize() in ("Critical", "High", "Urgent"))
        )
        if high_critical_count >= 4:
            priority_score = 20
        elif high_critical_count >= 2:
            priority_score = 12
        elif high_critical_count == 1:
            priority_score = 6
        else:
            priority_score = 0

        # Factor E: Overdue Active SLA Complaints (0-15 pts)
        overdue_count = sum(
            1
            for c in complaints
            if (c.status != "Resolved")
            and (c.deadline_date is not None)
            and (c.deadline_date < today)
        )
        if overdue_count >= 4:
            overdue_score = 15
        elif overdue_count >= 2:
            overdue_score = 10
        elif overdue_count == 1:
            overdue_score = 5
        else:
            overdue_score = 0

        # Composite Score Clamped to 100
        total_score = min(
            100,
            volume_score + recurrence_score + growth_score + priority_score + overdue_score,
        )

        # Concern Indicator Mapping
        if total_score >= 60:
            concern_level = "High Concern"
        elif total_score >= 30:
            concern_level = "Moderate Concern"
        else:
            concern_level = "Low Concern"

        # Generate Explainable Justification String
        justification_parts = []
        if recurrence_score >= 16:
            justification_parts.append(
                f"{recurring_complaints_count} recurring complaints in {recurring_categories_count} repeated categories"
                + (f" (primarily '{primary_recurring_category}')" if primary_recurring_category else "")
            )
        elif recurrence_score > 0:
            justification_parts.append(f"{recurring_complaints_count} recurring complaints detected")

        if growth_trend == "Increasing":
            justification_parts.append("an escalating monthly complaint trajectory")
        elif growth_trend == "Decreasing":
            justification_parts.append("a decreasing monthly complaint volume")

        if overdue_count > 0:
            justification_parts.append(f"{overdue_count} overdue SLA deadline {'breach' if overdue_count == 1 else 'breaches'}")

        if high_critical_count > 0:
            justification_parts.append(f"{high_critical_count} active High/Critical priority {'case' if high_critical_count == 1 else 'cases'}")

        if not justification_parts:
            if total_count <= 2:
                explanation = "Low Concern: Low complaint volume with zero recurring issues and clean SLA compliance."
            else:
                explanation = f"Low Concern: Stable baseline volume ({total_count} complaints) with satisfactory redressal compliance."
        else:
            explanation = f"{concern_level}: Campus exhibits " + ", ".join(justification_parts) + "."

        factors = RiskScoringFactors(
            volume_score=volume_score,
            volume_count=total_count,
            recurrence_score=recurrence_score,
            recurring_count=recurring_complaints_count,
            recurring_categories_count=recurring_categories_count,
            growth_score=growth_score,
            growth_trend=growth_trend,
            priority_score=priority_score,
            high_critical_count=high_critical_count,
            overdue_score=overdue_score,
            overdue_count=overdue_count,
            total_score=total_score,
        )

        return total_score, concern_level, factors, explanation

    @classmethod
    def get_risk_overview(
        cls,
        db: Session,
        user: Any,
        search: Optional[str] = None,
        bureau: Optional[str] = None,
        concern_level: Optional[str] = None,
        trend: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> InstitutionRiskOverviewResponse:
        """
        Retrieves Council-wide Institution Risk Analysis overview and filtered surveillance grid.
        Enforces role-based isolation (Institute accounts only see their own college).
        """
        user_role = (
            user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")
        ) or "officer"
        inst_id = (
            user.get("institution_id")
            if isinstance(user, dict)
            else getattr(user, "institution_id", None)
        )

        # Base Institutions Query
        inst_query = db.query(Institution).filter(Institution.is_active.is_(True))
        if str(user_role).lower() == "institute" and inst_id:
            inst_query = inst_query.filter(Institution.id == inst_id)

        institutions = inst_query.all()

        # Complaints Query with optional date range filter
        comp_query = db.query(Complaint).filter(Complaint.institution_id.isnot(None))
        if str(user_role).lower() == "institute" and inst_id:
            comp_query = comp_query.filter(Complaint.institution_id == inst_id)

        if date_from:
            comp_query = comp_query.filter(Complaint.filing_date >= date_from)

        if date_to:
            comp_query = comp_query.filter(Complaint.filing_date <= date_to)

        all_complaints = comp_query.order_by(Complaint.filing_date.asc().nullslast()).all()

        # Group complaints by institution_id
        inst_complaints_map: Dict[int, List[Complaint]] = defaultdict(list)
        category_recurrence_counter: Dict[str, int] = defaultdict(int)

        for c in all_complaints:
            inst_complaints_map[c.institution_id].append(c)

        # Calculate risk scores across all institutions
        items: List[InstitutionRiskItem] = []
        high_count = 0
        moderate_count = 0
        low_count = 0
        insufficient_count = 0

        concern_dist: Dict[str, int] = defaultdict(int)
        trend_dist: Dict[str, int] = defaultdict(int)
        bureau_risk_dist: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

        for inst in institutions:
            c_list = inst_complaints_map.get(inst.id, [])
            total_score, c_level, factors, expl = cls.calculate_institution_risk(inst, c_list)

            # Update KPI counters
            if c_level == "High Concern":
                high_count += 1
            elif c_level == "Moderate Concern":
                moderate_count += 1
            elif c_level == "Low Concern":
                low_count += 1
            else:
                insufficient_count += 1

            concern_dist[c_level] += 1
            trend_dist[factors.growth_trend] += 1
            bureau_name = inst.bureau_jurisdiction or "Approval Bureau"
            bureau_risk_dist[bureau_name][c_level] += 1

            # Accumulate recurring categories among moderate/high concern institutions
            if c_level in ("High Concern", "Moderate Concern"):
                inst_cats: Dict[str, int] = defaultdict(int)
                for comp in c_list:
                    inst_cats[comp.category] += 1
                for c_name, count in inst_cats.items():
                    if count >= 2:
                        category_recurrence_counter[c_name] += count

            # Bureau Filter: matches either institution jurisdiction or complaints bureau
            if bureau and bureau.lower() != "all":
                b_filter = bureau.strip().lower()
                inst_bureau = (inst.bureau_jurisdiction or "").strip().lower()
                complaint_bureaus = {c.bureau.strip().lower() for c in c_list if c.bureau}
                if inst_bureau != b_filter and b_filter not in complaint_bureaus:
                    continue

            # Filter checks
            if concern_level and concern_level.lower() != "all":
                if c_level.lower() != concern_level.strip().lower():
                    continue

            if trend and trend.lower() != "all":
                if factors.growth_trend.lower() != trend.strip().lower():
                    continue

            if search:
                s_lower = search.strip().lower()
                matches = (
                    s_lower in (inst.name or "").lower()
                    or s_lower in (inst.aicte_id or "").lower()
                    or s_lower in (inst.city or "").lower()
                    or s_lower in (inst.state or "").lower()
                )
                if not matches:
                    continue

            active_cnt = sum(1 for c in c_list if c.status != "Resolved")
            resolved_cnt = sum(1 for c in c_list if c.status == "Resolved")

            items.append(
                InstitutionRiskItem(
                    institution_id=inst.id,
                    aicte_id=inst.aicte_id,
                    name=inst.name,
                    state=inst.state,
                    city=inst.city,
                    bureau=inst.bureau_jurisdiction or "Approval Bureau",
                    total_complaints=factors.volume_count,
                    active_complaints=active_cnt,
                    resolved_complaints=resolved_cnt,
                    recurring_complaints=factors.recurring_count,
                    trend=factors.growth_trend,
                    high_critical_cases=factors.high_critical_count,
                    overdue_cases=factors.overdue_count,
                    risk_score=total_score,
                    concern_level=c_level,
                    primary_concern_reason=expl,
                    factors=factors,
                )
            )

        # Sort: High Concern first, then highest risk score
        concern_order = {"High Concern": 3, "Moderate Concern": 2, "Low Concern": 1, "Insufficient Data": 0}
        items.sort(key=lambda x: (-concern_order.get(x.concern_level, 0), -x.risk_score, -x.total_complaints, x.name))

        # Format Top Recurring Categories
        top_cats = [
            {"category": k, "count": v}
            for k, v in sorted(category_recurrence_counter.items(), key=lambda item: -item[1])[:8]
        ]

        return InstitutionRiskOverviewResponse(
            total_institutions_analyzed=len(institutions),
            high_concern_count=high_count,
            moderate_concern_count=moderate_count,
            low_concern_count=low_count,
            insufficient_data_count=insufficient_count,
            concern_level_distribution=dict(concern_dist),
            trend_distribution=dict(trend_dist),
            bureau_risk_distribution={k: dict(v) for k, v in bureau_risk_dist.items()},
            top_recurring_risk_categories=top_cats,
            institutions=items,
            disclaimer=cls.DISCLAIMER_TEXT,
        )

    @classmethod
    def get_institution_risk_detail(
        cls,
        db: Session,
        institution_id: int,
        user: Any,
    ) -> InstitutionRiskDetailResponse:
        """
        Deep-dive risk profile for an institution.
        Enforces user scoping (Institute users can only access their own institution).
        """
        user_role = (
            user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")
        ) or "officer"
        inst_id = (
            user.get("institution_id")
            if isinstance(user, dict)
            else getattr(user, "institution_id", None)
        )

        if str(user_role).lower() == "institute" and inst_id and inst_id != institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are only authorized to inspect your own college risk profile.",
            )

        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if not inst:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Institution with ID #{institution_id} not found.",
            )

        complaints = (
            db.query(Complaint)
            .filter(Complaint.institution_id == inst.id)
            .order_by(Complaint.filing_date.desc().nullslast())
            .all()
        )

        total_score, concern_level, factors, explanation = cls.calculate_institution_risk(inst, complaints)

        active_cnt = sum(1 for c in complaints if c.status != "Resolved")
        resolved_cnt = sum(1 for c in complaints if c.status == "Resolved")
        today = date.today()

        # Monthly trends
        monthly_map: Dict[str, int] = defaultdict(int)
        for c in complaints:
            m = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
            monthly_map[m] += 1

        all_months = sorted(monthly_map.keys()) if monthly_map else ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]
        monthly_trend = [
            MonthlyRiskTrendPoint(month=m, count=monthly_map.get(m, 0))
            for m in all_months
        ]

        # Recurring categories breakdown
        cat_counts: Dict[str, int] = defaultdict(int)
        for c in complaints:
            cat_counts[c.category] += 1
        recurring_categories = [
            RecurringCategoryStat(category=k, count=v, is_recurring=(v >= 2))
            for k, v in sorted(cat_counts.items(), key=lambda x: -x[1])
        ]

        # Complaints list summaries
        complaints_list: List[RiskComplaintSummary] = []
        for c in complaints:
            is_overdue = (
                c.status != "Resolved"
                and c.deadline_date is not None
                and c.deadline_date < today
            )
            complaints_list.append(
                RiskComplaintSummary(
                    id=c.id,
                    complaint_no=c.complaint_no,
                    category=c.category,
                    subject=c.subject,
                    status=c.status or "New",
                    priority=c.priority or "Medium",
                    is_overdue=is_overdue,
                    filing_date=c.filing_date.isoformat() if c.filing_date else None,
                    deadline_date=c.deadline_date.isoformat() if c.deadline_date else None,
                )
            )

        data_period = (
            f"{all_months[0]} to {all_months[-1]}" if len(all_months) > 1 else "Current Calendar Year"
        )

        return InstitutionRiskDetailResponse(
            institution_id=inst.id,
            aicte_id=inst.aicte_id,
            name=inst.name,
            state=inst.state,
            city=inst.city,
            institution_type=inst.institution_type,
            bureau_jurisdiction=inst.bureau_jurisdiction,
            total_complaints=len(complaints),
            active_complaints=active_cnt,
            resolved_complaints=resolved_cnt,
            overdue_complaints=factors.overdue_count,
            recurring_complaints=factors.recurring_count,
            recurring_categories=recurring_categories,
            monthly_trend=monthly_trend,
            high_critical_cases=factors.high_critical_count,
            risk_score=total_score,
            concern_level=concern_level,
            scoring_factors=factors,
            explanation=explanation,
            data_coverage_period=data_period,
            data_limitations=cls.DATA_LIMITATIONS_TEXT,
            active_complaints_list=complaints_list,
            disclaimer=cls.DISCLAIMER_TEXT,
        )
