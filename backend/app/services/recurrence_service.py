"""
Recurrence Radar Service for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3.4:
- Systemic recurrence detection within institutions
- Repeated category identification
- Month-by-month trajectory analysis
- Mathematical trend classification (Increasing, Decreasing, Stable, Insufficient Data)
- Role-based scoping for AICTE officers vs Technical Institutes
"""

from collections import defaultdict
from datetime import date, datetime
import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.complaint import Complaint
from app.models.institution import Institution
from app.schemas.recurrence import (
    CategoryRecurrenceStat,
    InstitutionRecurrenceComplaint,
    InstitutionRecurrenceDetailResponse,
    InstitutionRecurrenceItem,
    MonthlyTrendPoint,
    RecurrenceRadarOverviewResponse,
)

logger = logging.getLogger(__name__)


class RecurrenceService:
    """Service encapsulating systemic recurrence calculations and time-series trend analysis."""

    @staticmethod
    def classify_trend(monthly_counts: Dict[str, int]) -> str:
        """
        Classifies the temporal trend of complaints over time.
        Categories:
        - 'Insufficient Data': < 2 distinct active months
        - 'Increasing': Complaint volume surging/escalating (> +15% or positive slope)
        - 'Decreasing': Complaint volume declining (< -15% or negative slope)
        - 'Stable': Complaint volume steady within +-15%
        """
        if not monthly_counts:
            return "Insufficient Data"

        # Sort months chronologically
        sorted_months = sorted(monthly_counts.keys())
        counts = [monthly_counts[m] for m in sorted_months]

        # Need at least 2 active months with complaints to establish a pattern
        non_zero_periods = [c for c in counts if c > 0]
        if len(non_zero_periods) < 2:
            return "Insufficient Data"

        n = len(counts)
        if n == 2:
            prev_val = counts[0]
            curr_val = counts[1]
            if prev_val == 0:
                return "Increasing" if curr_val > 0 else "Stable"
            pct = (curr_val - prev_val) / prev_val
            if pct > 0.15:
                return "Increasing"
            elif pct < -0.15:
                return "Decreasing"
            else:
                return "Stable"

        # For n >= 3, compare recent half average vs earlier half average and calculate linear slope
        mid = n // 2
        earlier_mean = sum(counts[:mid]) / float(mid)
        recent_mean = sum(counts[mid:]) / float(n - mid)

        # Linear regression slope: slope = sum((x - mean_x) * (y - mean_y)) / sum((x - mean_x)^2)
        mean_x = (n - 1) / 2.0
        mean_y = sum(counts) / float(n)
        numerator = sum((i - mean_x) * (counts[i] - mean_y) for i in range(n))
        denominator = sum((i - mean_x) ** 2 for i in range(n))
        slope = (numerator / denominator) if denominator != 0 else 0.0

        if earlier_mean == 0 and recent_mean > 0:
            return "Increasing"
        elif earlier_mean > 0 and recent_mean == 0:
            return "Decreasing"
        elif earlier_mean > 0:
            growth_rate = (recent_mean - earlier_mean) / earlier_mean
            if growth_rate > 0.15 and slope > 0.10:
                return "Increasing"
            elif growth_rate < -0.15 and slope < -0.10:
                return "Decreasing"
            else:
                return "Stable"

        return "Stable"

    @classmethod
    def get_recurrence_overview(
        cls,
        db: Session,
        user: Any,
        search: Optional[str] = None,
        category: Optional[str] = None,
        bureau: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> RecurrenceRadarOverviewResponse:
        """
        Computes Council-wide recurrence overview, KPI metrics, institution rankings,
        and monthly trend graphs. Scoped by user authorization.
        """
        user_role = (
            user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")
        ) or "officer"
        inst_id = (
            user.get("institution_id")
            if isinstance(user, dict)
            else getattr(user, "institution_id", None)
        )

        # Base query with joined institution
        query = (
            db.query(Complaint)
            .options(joinedload(Complaint.institution))
            .filter(Complaint.institution_id.isnot(None))
        )

        # Role-based scoping: Institute accounts ONLY see their own college grievances
        if str(user_role).lower() == "institute" and inst_id:
            query = query.filter(Complaint.institution_id == inst_id)

        # Filters
        if bureau and bureau.lower() != "all":
            query = query.filter(Complaint.bureau.ilike(bureau.strip()))

        if category and category.lower() != "all":
            query = query.filter(Complaint.category.ilike(category.strip()))

        if date_from:
            query = query.filter(Complaint.filing_date >= date_from)

        if date_to:
            query = query.filter(Complaint.filing_date <= date_to)

        complaints = query.order_by(Complaint.filing_date.asc().nullslast()).all()

        # Aggregations
        all_months_set = set()
        overall_monthly_counts: Dict[str, int] = defaultdict(int)
        overall_monthly_recurring: Dict[str, int] = defaultdict(int)

        # Group complaints by institution -> category -> list of complaints
        inst_category_map: Dict[int, Dict[str, List[Complaint]]] = defaultdict(
            lambda: defaultdict(list)
        )
        institution_obj_map: Dict[int, Institution] = {}
        category_institution_count: Dict[str, set] = defaultdict(set)
        category_total_count: Dict[str, int] = defaultdict(int)
        category_bureau_map: Dict[str, str] = {}
        bureau_recurrence_counter: Dict[str, int] = defaultdict(int)

        for c in complaints:
            m = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
            all_months_set.add(m)
            overall_monthly_counts[m] += 1

            inst_category_map[c.institution_id][c.category].append(c)
            if c.institution:
                institution_obj_map[c.institution_id] = c.institution

            category_institution_count[c.category].add(c.institution_id)
            category_total_count[c.category] += 1
            if c.bureau and c.category not in category_bureau_map:
                category_bureau_map[c.category] = c.bureau

        # Build institution items
        institution_items: List[InstitutionRecurrenceItem] = []
        total_recurring_complaints = 0
        institutions_with_recurrence_count = 0
        escalating_count = 0

        for i_id, cats in inst_category_map.items():
            inst = institution_obj_map.get(i_id)
            if not inst:
                continue

            # Optional search filter across institution name, AICTE ID, or city
            if search:
                s_lower = search.strip().lower()
                matches = (
                    s_lower in (inst.name or "").lower()
                    or s_lower in (inst.aicte_id or "").lower()
                    or s_lower in (inst.city or "").lower()
                )
                if not matches:
                    continue

            total_inst_complaints = sum(len(c_list) for c_list in cats.values())
            recurring_inst_count = 0
            primary_recurring_category = "General"
            primary_cat_max = 0

            # Monthly counts for this institution
            inst_monthly_counts: Dict[str, int] = defaultdict(int)
            inst_monthly_recurring: Dict[str, int] = defaultdict(int)

            for cat_name, c_list in cats.items():
                is_cat_recurring = len(c_list) >= 2
                if is_cat_recurring:
                    recurring_inst_count += len(c_list)
                    b_name = c_list[0].bureau if c_list else "Approval Bureau"
                    bureau_recurrence_counter[b_name] += len(c_list)

                    for c in c_list:
                        m_str = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
                        overall_monthly_recurring[m_str] += 1
                        inst_monthly_recurring[m_str] += 1

                for c in c_list:
                    m_str = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
                    inst_monthly_counts[m_str] += 1

                if len(c_list) > primary_cat_max:
                    primary_cat_max = len(c_list)
                    primary_recurring_category = cat_name

            trend = cls.classify_trend(inst_monthly_counts)
            if trend == "Increasing":
                escalating_count += 1

            if recurring_inst_count > 0:
                institutions_with_recurrence_count += 1
                total_recurring_complaints += recurring_inst_count

            # Monthly trend points for this institution
            sorted_all_months = sorted(all_months_set) if all_months_set else ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]
            monthly_trend_points = [
                MonthlyTrendPoint(
                    month=m,
                    total_complaints=inst_monthly_counts.get(m, 0),
                    recurring_complaints=inst_monthly_recurring.get(m, 0),
                )
                for m in sorted_all_months
            ]

            institution_items.append(
                InstitutionRecurrenceItem(
                    institution_id=inst.id,
                    aicte_id=inst.aicte_id,
                    name=inst.name,
                    state=inst.state,
                    city=inst.city,
                    bureau=inst.bureau_jurisdiction or "Approval Bureau",
                    total_complaints=total_inst_complaints,
                    recurring_complaints_count=recurring_inst_count,
                    primary_recurring_category=primary_recurring_category,
                    primary_category_count=primary_cat_max,
                    trend=trend,
                    monthly_trend=monthly_trend_points,
                )
            )

        # Sort institutions: highest recurring complaints first
        institution_items.sort(
            key=lambda x: (-x.recurring_complaints_count, -x.total_complaints, x.name)
        )

        # Overall monthly trajectory
        sorted_all_months = sorted(all_months_set) if all_months_set else ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]
        overall_monthly_trend = [
            MonthlyTrendPoint(
                month=m,
                total_complaints=overall_monthly_counts.get(m, 0),
                recurring_complaints=overall_monthly_recurring.get(m, 0),
            )
            for m in sorted_all_months
        ]

        # Top recurring categories
        top_recurring_categories: List[CategoryRecurrenceStat] = []
        for cat_name, cnt in sorted(category_total_count.items(), key=lambda x: -x[1]):
            aff_insts = len(category_institution_count[cat_name])
            # Category monthly trajectory
            cat_monthly: Dict[str, int] = defaultdict(int)
            for c in complaints:
                if c.category == cat_name:
                    m = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
                    cat_monthly[m] += 1
            cat_trend = cls.classify_trend(cat_monthly)

            top_recurring_categories.append(
                CategoryRecurrenceStat(
                    category=cat_name,
                    bureau=category_bureau_map.get(cat_name, "Approval Bureau"),
                    total_complaints=cnt,
                    institutions_affected_count=aff_insts,
                    trend=cat_trend,
                    is_recurring=(cnt >= 2),
                )
            )

        return RecurrenceRadarOverviewResponse(
            total_complaints_analyzed=len(complaints),
            total_recurring_complaints=total_recurring_complaints,
            institutions_monitored=len(institution_obj_map),
            institutions_with_recurrence=institutions_with_recurrence_count,
            escalating_institutions_count=escalating_count,
            top_recurring_categories=top_recurring_categories[:10],
            bureau_distribution=dict(bureau_recurrence_counter),
            overall_monthly_trend=overall_monthly_trend,
            institutions=institution_items,
        )

    @classmethod
    def get_institution_recurrence_detail(
        cls,
        db: Session,
        institution_id: int,
        user: Any,
    ) -> InstitutionRecurrenceDetailResponse:
        """
        Deep-dive recurrence profile for a specific institution.
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
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You are only authorized to inspect your own college recurrence profile.",
            )

        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if not inst:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Institution with ID #{institution_id} was not found.",
            )

        complaints = (
            db.query(Complaint)
            .filter(Complaint.institution_id == inst.id)
            .order_by(Complaint.filing_date.asc().nullslast())
            .all()
        )

        category_map: Dict[str, List[Complaint]] = defaultdict(list)
        monthly_counts: Dict[str, int] = defaultdict(int)
        monthly_recurring: Dict[str, int] = defaultdict(int)
        all_months_set = set()

        complaint_dtos: List[InstitutionRecurrenceComplaint] = []
        recurring_count = 0

        for c in complaints:
            category_map[c.category].append(c)
            m = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
            all_months_set.add(m)
            monthly_counts[m] += 1

            complaint_dtos.append(
                InstitutionRecurrenceComplaint(
                    id=c.id,
                    complaint_no=c.complaint_no,
                    category=c.category,
                    subject=c.subject,
                    status=c.status or "New",
                    priority=c.priority or "Medium",
                    filing_date=c.filing_date.isoformat() if c.filing_date else None,
                    deadline_date=c.deadline_date.isoformat() if c.deadline_date else None,
                )
            )

        category_stats: List[CategoryRecurrenceStat] = []
        for cat_name, c_list in category_map.items():
            is_rec = len(c_list) >= 2
            if is_rec:
                recurring_count += len(c_list)
                for c in c_list:
                    m = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
                    monthly_recurring[m] += 1

            cat_monthly: Dict[str, int] = defaultdict(int)
            for c in c_list:
                m = c.filing_date.strftime("%Y-%m") if c.filing_date else "2026-05"
                cat_monthly[m] += 1

            category_stats.append(
                CategoryRecurrenceStat(
                    category=cat_name,
                    bureau=c_list[0].bureau if c_list else inst.bureau_jurisdiction,
                    total_complaints=len(c_list),
                    institutions_affected_count=1,
                    trend=cls.classify_trend(cat_monthly),
                    is_recurring=is_rec,
                )
            )

        category_stats.sort(key=lambda x: -x.total_complaints)

        overall_trend = cls.classify_trend(monthly_counts)
        sorted_months = sorted(all_months_set) if all_months_set else ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]

        monthly_trend = [
            MonthlyTrendPoint(
                month=m,
                total_complaints=monthly_counts.get(m, 0),
                recurring_complaints=monthly_recurring.get(m, 0),
            )
            for m in sorted_months
        ]

        return InstitutionRecurrenceDetailResponse(
            institution_id=inst.id,
            aicte_id=inst.aicte_id,
            name=inst.name,
            state=inst.state,
            city=inst.city,
            bureau_jurisdiction=inst.bureau_jurisdiction,
            total_complaints=len(complaints),
            recurring_complaints_count=recurring_count,
            overall_trend=overall_trend,
            category_breakdown=category_stats,
            monthly_trend=monthly_trend,
            complaints=complaint_dtos,
        )
