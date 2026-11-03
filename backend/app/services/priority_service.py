"""
AI-Assisted Priority Recommendation Service for SIH26264 AICTE Complaint Intelligence.
Handles Feature 3.5:
- Multi-factor transparent priority scoring (Severity, Ageing, Deadline SLA, Escalation)
- Tier classification: Critical, High, Medium, Low
- Human-readable explanation generation
- Officer review actions: Accept recommendation or Override priority
- Decision audit logging and recommendation history preservation
- Strict role-based permissions (officers only for decisions; institutes read-only for own cases)
"""

from datetime import date, datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session, joinedload

from app.models.complaint import Complaint
from app.models.institution import Institution
from app.models.priority_recommendation import PriorityRecommendation
from app.models.user import User
from app.schemas.priority import (
    PriorityDashboardResponse,
    PriorityFactors,
    PriorityHistoryItem,
    PriorityRecommendationOut,
)

logger = logging.getLogger(__name__)

# Keywords for severity assessment
CRITICAL_SEVERITY_KEYWORDS = [
    "ragging",
    "harassment",
    "sexual",
    "extortion",
    "suicide",
    "physical",
    "threat",
    "violence",
    "bribe",
    "assault",
    "scam",
]

HIGH_SEVERITY_KEYWORDS = [
    "capitation",
    "withheld",
    "original certificate",
    "fake faculty",
    "ghost faculty",
    "salary",
    "non-payment",
    "admission fraud",
    "affiliation breach",
    "unauthorized fee",
    "surcharge",
]


class PriorityService:
    """Service implementing AI-assisted statutory priority recommendation and officer decision workflows."""

    PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"]

    PRIORITY_RANK = {
        "Critical": 4,
        "Urgent": 4,
        "High": 3,
        "Medium": 2,
        "Low": 1,
    }

    @classmethod
    def evaluate_priority_factors(
        cls,
        complaint: Complaint,
        reference_date: Optional[date] = None,
    ) -> Tuple[int, str, PriorityFactors, str]:
        """
        Calculates the transparent multi-factor score (0-100), recommended priority tier,
        and human-readable explanation.
        """
        today = reference_date or date.today()
        status_clean = (complaint.status or "").strip().lower()

        # Closed / Resolved cases are inherently Low priority
        if status_clean in ("resolved", "closed"):
            factors = PriorityFactors(
                severity_score=0,
                severity_category="Resolved Case",
                ageing_days=0,
                ageing_score=0,
                deadline_status="Resolved",
                deadline_score=0,
                escalation_score=0,
                recurring_score=0,
                total_score=0,
            )
            return 0, "Low", factors, "Complaint has already reached resolution."

        # 1. Severity Score (10 to 45 pts)
        subj_text = complaint.translated_subject or complaint.subject or ""
        desc_text = complaint.translated_description or complaint.description or ""
        text_corpus = f"{complaint.category or ''} {subj_text} {desc_text}".lower()
        if any(kw in text_corpus for kw in CRITICAL_SEVERITY_KEYWORDS):
            severity_score = 40
            severity_category = "Critical Safety / Norm Violation"
        elif any(kw in text_corpus for kw in HIGH_SEVERITY_KEYWORDS):
            severity_score = 30
            severity_category = "High Severity Non-Compliance"
        elif any(w in text_corpus for w in ["fee", "examination", "infrastructure", "admission"]):
            severity_score = 20
            severity_category = "Standard Institutional Grievance"
        else:
            severity_score = 12
            severity_category = "General Inquiry"

        # Complainant vulnerability bonus (+5 pts for Student or Anonymous)
        if (complaint.complainant_type or "").strip().lower() in ("student", "anonymous"):
            severity_score += 5

        # 2. Ageing Pending Score (2 to 25 pts)
        filing = complaint.filing_date or (complaint.created_at.date() if complaint.created_at else today)
        ageing_days = max(0, (today - filing).days)

        if ageing_days >= 60:
            ageing_score = 25
        elif ageing_days >= 30:
            ageing_score = 18
        elif ageing_days >= 15:
            ageing_score = 12
        elif ageing_days >= 7:
            ageing_score = 6
        else:
            ageing_score = 2

        # 3. Deadline / SLA Urgency Score (0 to 30 pts)
        deadline_score = 0
        if complaint.deadline_date is None:
            deadline_status = "Missing Deadline"
            deadline_score = 5  # Unscheduled case needs triage
        else:
            days_rem = (complaint.deadline_date - today).days
            if days_rem < 0:
                deadline_status = "Overdue"
                deadline_score = 30 if abs(days_rem) > 14 else 25
            elif days_rem == 0:
                deadline_status = "Due Today"
                deadline_score = 20
            elif days_rem <= 3:
                deadline_status = "Approaching (<= 3d)"
                deadline_score = 15
            elif days_rem <= 7:
                deadline_status = "Upcoming (4-7d)"
                deadline_score = 8
            else:
                deadline_status = "Normal"
                deadline_score = 0

        # 4. Escalation & Systemic Factor (0 to 15 pts)
        escalation_score = 10 if complaint.is_escalated else 0
        recurring_score = 5  # Base systemic sensitivity

        # Total Composite Score (Clamped to 100)
        total_score = min(
            100,
            severity_score + ageing_score + deadline_score + escalation_score + recurring_score,
        )

        # Priority Tier Assignment
        if total_score >= 75 or (deadline_status == "Overdue" and severity_score >= 35):
            recommended_priority = "Critical"
        elif total_score >= 55:
            recommended_priority = "High"
        elif total_score >= 35:
            recommended_priority = "Medium"
        else:
            recommended_priority = "Low"

        # Construct Human-Readable Reason
        reason_parts = [
            f"Severity: {severity_category} (+{severity_score})",
            f"Ageing: {ageing_days}d pending (+{ageing_score})",
        ]
        if deadline_score > 0:
            reason_parts.append(f"SLA: {deadline_status} (+{deadline_score})")
        if escalation_score > 0:
            reason_parts.append(f"Escalated Flag (+{escalation_score})")

        explanation = f"{' + '.join(reason_parts)} = Score {total_score}/100 -> Recommended {recommended_priority}."

        factors = PriorityFactors(
            severity_score=severity_score,
            severity_category=severity_category,
            ageing_days=ageing_days,
            ageing_score=ageing_score,
            deadline_status=deadline_status,
            deadline_score=deadline_score,
            escalation_score=escalation_score,
            recurring_score=recurring_score,
            total_score=total_score,
        )

        return total_score, recommended_priority, factors, explanation

    @classmethod
    def get_or_create_recommendation(
        cls,
        db: Session,
        complaint: Complaint,
        reference_date: Optional[date] = None,
    ) -> PriorityRecommendation:
        """
        Retrieves existing active recommendation or generates and stores a new one.
        """
        existing = (
            db.query(PriorityRecommendation)
            .filter(PriorityRecommendation.complaint_id == complaint.id)
            .order_by(PriorityRecommendation.id.desc())
            .first()
        )

        if existing:
            return existing

        # Generate fresh recommendation
        score, rec_priority, factors, reason = cls.evaluate_priority_factors(
            complaint, reference_date
        )

        rec = PriorityRecommendation(
            complaint_id=complaint.id,
            recommended_priority=rec_priority,
            score=score,
            factors=factors.model_dump(),
            reason=reason,
            status="Pending Review",
            initial_priority=complaint.priority or "Medium",
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec

    @classmethod
    def to_recommendation_out(
        cls,
        complaint: Complaint,
        rec: PriorityRecommendation,
    ) -> PriorityRecommendationOut:
        """Converts complaint and recommendation ORM instances into full API DTO."""
        curr_p = complaint.priority or "Medium"
        rec_p = rec.recommended_priority

        # Discrepancy occurs if current priority is lower rank than AI recommended priority
        curr_rank = cls.PRIORITY_RANK.get(curr_p, 2)
        rec_rank = cls.PRIORITY_RANK.get(rec_p, 2)
        has_discrepancy = (rec_rank > curr_rank) and (rec.status == "Pending Review")

        decider_name = None
        if rec.decider:
            decider_name = rec.decider.full_name

        inst_name = (
            complaint.institution.name
            if complaint.institution
            else f"Institution #{complaint.institution_id}"
        )

        return PriorityRecommendationOut(
            id=rec.id,
            complaint_id=complaint.id,
            complaint_no=complaint.complaint_no,
            institution_id=complaint.institution_id,
            institution_name=inst_name,
            bureau=complaint.bureau,
            category=complaint.category,
            subject=complaint.subject,
            current_priority=curr_p,
            recommended_priority=rec_p,
            score=rec.score,
            factors=rec.factors,
            reason=rec.reason,
            status=rec.status,
            has_discrepancy=has_discrepancy,
            initial_priority=rec.initial_priority,
            final_priority=rec.final_priority,
            decision_notes=rec.decision_notes,
            decided_by=rec.decided_by,
            decided_by_name=decider_name,
            decided_at=rec.decided_at,
            deadline_date=complaint.deadline_date,
            filing_date=complaint.filing_date,
            complaint_status=complaint.status,
            created_at=rec.created_at,
        )

    @classmethod
    def accept_recommendation(
        cls,
        db: Session,
        complaint_id: int,
        user: Any,
        notes: Optional[str] = None,
    ) -> PriorityRecommendationOut:
        """
        Officer accepts the AI recommendation.
        Updates complaint.priority to the recommended priority.
        Records status = 'Accepted'.
        """
        user_role = (
            user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")
        ) or "officer"
        user_id = (
            user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
        )

        if str(user_role).lower() == "institute":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Technical Institute users cannot modify official AICTE priority decisions.",
            )

        complaint = (
            db.query(Complaint)
            .options(joinedload(Complaint.institution))
            .filter(Complaint.id == complaint_id)
            .first()
        )
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint #{complaint_id} not found.",
            )

        rec = cls.get_or_create_recommendation(db, complaint)

        # Apply update
        initial_p = complaint.priority or "Medium"
        new_p = rec.recommended_priority

        complaint.priority = new_p
        rec.status = "Accepted"
        rec.initial_priority = initial_p
        rec.final_priority = new_p
        rec.decision_notes = notes or f"Accepted AI recommended priority ({new_p})."
        rec.decided_by = user_id
        rec.decided_at = datetime.now(timezone.utc)
        rec.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(complaint)
        db.refresh(rec)

        logger.info(
            "Priority Accepted: Complaint %s priority updated from %s to %s by user %s",
            complaint.complaint_no,
            initial_p,
            new_p,
            user_id,
        )
        return cls.to_recommendation_out(complaint, rec)

    @classmethod
    def override_recommendation(
        cls,
        db: Session,
        complaint_id: int,
        user: Any,
        chosen_priority: str,
        justification: Optional[str] = None,
    ) -> PriorityRecommendationOut:
        """
        Officer overrides the AI recommendation with a chosen priority level.
        Updates complaint.priority to chosen_priority.
        Records status = 'Overridden' with justification notes.
        """
        user_role = (
            user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")
        ) or "officer"
        user_id = (
            user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
        )

        if str(user_role).lower() == "institute":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Technical Institute users cannot modify official AICTE priority decisions.",
            )

        normalized_p = chosen_priority.strip().capitalize()
        if normalized_p not in cls.PRIORITY_LEVELS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority '{chosen_priority}'. Must be one of: {', '.join(cls.PRIORITY_LEVELS)}.",
            )

        complaint = (
            db.query(Complaint)
            .options(joinedload(Complaint.institution))
            .filter(Complaint.id == complaint_id)
            .first()
        )
        if not complaint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Complaint #{complaint_id} not found.",
            )

        rec = cls.get_or_create_recommendation(db, complaint)

        initial_p = complaint.priority or "Medium"
        complaint.priority = normalized_p

        rec.status = "Overridden"
        rec.initial_priority = initial_p
        rec.final_priority = normalized_p
        rec.decision_notes = justification or f"Manually overridden to {normalized_p}."
        rec.decided_by = user_id
        rec.decided_at = datetime.now(timezone.utc)
        rec.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(complaint)
        db.refresh(rec)

        logger.info(
            "Priority Overridden: Complaint %s priority changed from %s to %s by user %s. Justification: %s",
            complaint.complaint_no,
            initial_p,
            normalized_p,
            user_id,
            justification,
        )
        return cls.to_recommendation_out(complaint, rec)

    @classmethod
    def get_priority_dashboard_telemetry(
        cls,
        db: Session,
        user: Any,
        bureau: Optional[str] = None,
        recommended_priority: Optional[str] = None,
        discrepancy_only: bool = False,
        search: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> PriorityDashboardResponse:
        """
        Computes Council-wide Priority Monitoring telemetry:
        - Critical, High, Medium, Low breakdown
        - Recommendations awaiting review
        - Discrepancy cases
        - Priority distribution comparing Assigned vs AI Recommended
        - Paginated recommendation list with filters
        """
        user_role = (
            user.get("role") if isinstance(user, dict) else getattr(user, "role", "officer")
        ) or "officer"
        inst_id = (
            user.get("institution_id")
            if isinstance(user, dict)
            else getattr(user, "institution_id", None)
        )

        # Base query of active complaints
        base_query = (
            db.query(Complaint)
            .options(
                joinedload(Complaint.institution),
                joinedload(Complaint.priority_recommendations),
            )
            .filter(~Complaint.status.in_(["Resolved", "Closed"]))
        )

        # Scoping
        if str(user_role).lower() == "institute" and inst_id:
            base_query = base_query.filter(Complaint.institution_id == inst_id)

        if bureau and bureau.lower() != "all":
            base_query = base_query.filter(Complaint.bureau.ilike(bureau.strip()))

        active_complaints = base_query.order_by(Complaint.filing_date.desc().nullslast()).all()

        # Batch ensure recommendations exist for active complaints
        all_dtos: List[PriorityRecommendationOut] = []
        critical_cnt = 0
        high_cnt = 0
        medium_cnt = 0
        low_cnt = 0
        awaiting_review_cnt = 0
        discrepancy_cnt = 0

        assigned_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        recommended_dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

        for c in active_complaints:
            # Check if active recommendation already loaded in relationship
            rec = None
            if c.priority_recommendations:
                rec = sorted(c.priority_recommendations, key=lambda x: x.id, reverse=True)[0]
            if not rec:
                rec = cls.get_or_create_recommendation(db, c)

            dto = cls.to_recommendation_out(c, rec)
            all_dtos.append(dto)

            # Tally counts
            if dto.recommended_priority == "Critical":
                critical_cnt += 1
            elif dto.recommended_priority == "High":
                high_cnt += 1
            elif dto.recommended_priority == "Medium":
                medium_cnt += 1
            else:
                low_cnt += 1

            if dto.status == "Pending Review":
                awaiting_review_cnt += 1

            if dto.has_discrepancy:
                discrepancy_cnt += 1

            # Distribution tallies
            assigned_key = c.priority.capitalize() if c.priority else "Medium"
            if assigned_key in assigned_dist:
                assigned_dist[assigned_key] += 1
            elif assigned_key == "Urgent":
                assigned_dist["Critical"] += 1

            rec_key = dto.recommended_priority
            if rec_key in recommended_dist:
                recommended_dist[rec_key] += 1

        # Apply in-memory list filters
        filtered_dtos = all_dtos

        if search:
            s_low = search.strip().lower()
            filtered_dtos = [
                d
                for d in filtered_dtos
                if (
                    s_low in d.complaint_no.lower()
                    or s_low in d.institution_name.lower()
                    or s_low in d.category.lower()
                    or s_low in d.subject.lower()
                )
            ]

        if recommended_priority and recommended_priority.lower() != "all":
            filtered_dtos = [
                d for d in filtered_dtos if d.recommended_priority.lower() == recommended_priority.strip().lower()
            ]

        if discrepancy_only:
            filtered_dtos = [d for d in filtered_dtos if d.has_discrepancy]

        # Sort: Discrepancies and Critical first, then by score descending
        filtered_dtos.sort(
            key=lambda x: (
                0 if x.has_discrepancy else 1,
                -x.score,
                x.complaint_no,
            )
        )

        paged_dtos = filtered_dtos[skip : skip + limit]

        return PriorityDashboardResponse(
            total_active_complaints=len(active_complaints),
            critical_count=critical_cnt,
            high_count=high_cnt,
            medium_count=medium_cnt,
            low_count=low_cnt,
            awaiting_review_count=awaiting_review_cnt,
            discrepancy_count=discrepancy_cnt,
            priority_distribution={
                "assigned": assigned_dist,
                "recommended": recommended_dist,
            },
            recommendations=paged_dtos,
        )

    @classmethod
    def get_priority_history(
        cls,
        db: Session,
        complaint_id: int,
    ) -> List[PriorityHistoryItem]:
        """Fetches recommendation and officer decision audit logs for a complaint."""
        recs = (
            db.query(PriorityRecommendation)
            .options(joinedload(PriorityRecommendation.decider))
            .filter(PriorityRecommendation.complaint_id == complaint_id)
            .order_by(PriorityRecommendation.id.desc())
            .all()
        )

        items: List[PriorityHistoryItem] = []
        for r in recs:
            decider_name = r.decider.full_name if r.decider else "System"
            items.append(
                PriorityHistoryItem(
                    id=r.id,
                    complaint_id=r.complaint_id,
                    recommended_priority=r.recommended_priority,
                    score=r.score,
                    status=r.status,
                    initial_priority=r.initial_priority,
                    final_priority=r.final_priority,
                    decision_notes=r.decision_notes,
                    decided_by_name=decider_name,
                    decided_at=r.decided_at,
                    created_at=r.created_at,
                )
            )
        return items

