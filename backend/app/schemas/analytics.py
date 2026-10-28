"""
Pydantic schemas for Analytics request and response validation.
"""

from typing import Dict, List
from pydantic import BaseModel, Field


class MonthlyTrendItem(BaseModel):
    month: str = Field(..., description="Month name abbreviation (e.g. 'May', 'Jun')")
    received: int = Field(0, description="Total complaints filed during this month")
    resolved: int = Field(0, description="Total complaints resolved during this month")
    overlaps: int = Field(0, description="Overlapping complaint pairs identified")


class BureauStatItem(BaseModel):
    name: str = Field(..., description="Bureau or cell name")
    active: int = Field(0, description="Active complaints pending resolution")
    resolved: int = Field(0, description="Resolved complaints")
    total: int = Field(0, description="Total complaints logged")
    slaOnTime: float = Field(0.0, description="SLA compliance percentage")


class DashboardSummaryOut(BaseModel):
    total_complaints: int = Field(0, description="Total monitored grievance records")
    active_complaints: int = Field(0, description="Active grievances pending resolution")
    resolved_complaints: int = Field(0, description="Resolved grievances")
    escalated_complaints: int = Field(0, description="Escalated grievances")
    overdue_complaints: int = Field(0, description="Overdue grievances past SLA deadline")
    total_institutions: int = Field(0, description="Total registered institutions")
    sla_compliance_rate: float = Field(0.0, description="Council-wide SLA compliance rate percentage")

    # AI Engine metrics (honestly reported from respective tables)
    total_overlaps: int = Field(0, description="Total cross-bureau overlap detections")
    high_confidence_overlaps: int = Field(0, description="High confidence overlap detections (>= 85%)")
    total_patterns: int = Field(0, description="Total systemic problem patterns identified")
    institutions_affected_by_patterns: int = Field(0, description="Institutions affected by problem patterns")
    evidence_total: int = Field(0, description="Total resolution evidence documents processed")
    evidence_verified_count: int = Field(0, description="Total resolution evidence documents verified")
    evidence_verification_rate: float = Field(0.0, description="Evidence verification compliance rate percentage")

    # Aggregated telemetry
    monthly_trends: List[MonthlyTrendItem] = Field(
        default_factory=list,
        description="Monthly inflow and resolution velocity",
    )
    bureau_distribution: List[BureauStatItem] = Field(
        default_factory=list,
        description="Per-bureau complaint workload",
    )
    status_distribution: Dict[str, int] = Field(
        default_factory=dict,
        description="Distribution count by status",
    )
    priority_distribution: Dict[str, int] = Field(
        default_factory=dict,
        description="Distribution count by priority",
    )

