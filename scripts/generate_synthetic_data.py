"""
SIH26264 - Synthetic Complaint & Institution Data Generator
Generates reproducible fictional institution and grievance datasets across AICTE bureaus.
Designed for testing multi-bureau intelligence, case overlap detection, and pattern clustering.

DISCLAIMER:
All generated institutions, complaints, names, and case IDs are entirely fictional and
synthetic. They are generated solely for research, testing, and evaluation of the SIH26264
decision-support dashboard. They do NOT represent actual AICTE records or real institutions.

Usage:
    # 1. Default Dry-Run (Generates 500 complaints and saves to JSON, zero database writes):
    python scripts/generate_synthetic_data.py --count 500 --output data/synthetic_complaints.json

    # 2. Database Insertion (Requires explicit --confirm-write flag):
    python scripts/generate_synthetic_data.py --count 500 --confirm-write
"""

import argparse
from datetime import date, datetime, timedelta, timezone
import json
import logging
from pathlib import Path
import random
import sys
from typing import Any, Dict, List, Optional, Tuple

# Ensure backend directory is in sys.path so app models and database can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("synthetic_generator")

# ==============================================================================
# Fictional Master Data Pools
# ==============================================================================

FICTIONAL_INSTITUTION_NAMES = [
    "Apex Institute of Advanced Technology",
    "Horizon Engineering Academy",
    "Zenith Polytechnic Institute",
    "Vanguard College of Technology & Research",
    "Pioneer Institute of Engineering Studies",
    "Sterling University of Applied Technology",
    "Global Institute of Technical Education",
    "Beacon Institute of Science & Technology",
    "Orion Engineering & Management Campus",
    "Vertex Technical Academy",
    "Summit College of Engineering",
    "Trident Institute of Technology",
    "Aurora Academy of Engineering & Sciences",
    "Crestview Institute of Technology",
    "Elysium College of Technical Studies",
    "Imperial Institute of Engineering",
    "Meridian Academy of Technology",
    "Nexus Institute of Computer Sciences",
    "Paragon Engineering College",
    "Radiant Polytechnic Institute",
    "Quantum Institute of Technology",
    "Solaris Engineering College",
    "Terra Institute of Applied Sciences",
    "Unity Technical Campus",
    "Valor Institute of Engineering & Technology",
    "Western Hills Institute of Technology",
    "Eastern Gateway Engineering Academy",
    "Southern Star Technical Institute",
    "Northern Crest College of Technology",
    "Central Valley Institute of Engineering",
]

CITIES_AND_STATES = [
    ("Pune", "Maharashtra"),
    ("Bengaluru", "Karnataka"),
    ("Chennai", "Tamil Nadu"),
    ("Noida", "Uttar Pradesh"),
    ("Ludhiana", "Punjab"),
    ("Gurugram", "Haryana"),
    ("Ahmedabad", "Gujarat"),
    ("Jaipur", "Rajasthan"),
    ("Hyderabad", "Telangana"),
    ("Kochi", "Kerala"),
    ("Bhopal", "Madhya Pradesh"),
    ("Kolkata", "West Bengal"),
    ("Dehradun", "Uttarakhand"),
    ("Bhubaneswar", "Odisha"),
    ("Ranchi", "Jharkhand"),
]

BUREAUS = [
    "Approval Bureau",
    "Public Grievance Redressal Cell (PGRC)",
    "Anti-Ragging Cell",
    "Faculty & Staff Grievances Cell",
    "Finance & Scholarships Bureau",
    "Legal & Redressal Cell",
]

COMPLAINANT_TYPES = ["Student", "Faculty", "Parent", "Anonymous", "Public"]
PRIORITIES = ["Low", "Medium", "High", "Urgent"]
STATUSES = ["New", "Under Review", "Evidence Requested", "Resolved", "Escalated"]

# Grievance topic definitions: (Category, Bureau, Subject template, Description template)
GRIEVANCE_TOPICS = [
    (
        "Excessive / Non-Sanctioned Fee Surcharges",
        "Approval Bureau",
        "Collection of unapproved development and campus amenity fees",
        "Students of second and third year B.Tech were issued mandatory fee circulars demanding Rs 35,000 for development and amenity charges not approved by the State Fee Regulatory Committee. Administration has threatened withholding examination admit cards upon non-payment.",
    ),
    (
        "Withholding of Original Academic Certificates",
        "Public Grievance Redressal Cell (PGRC)",
        "Refusal to release 10th and 12th original marksheets upon course exit",
        "College administration is refusing to return original 10th and 12th certificates to complainant following official admission cancellation before the prescribed cut-off date, violating AICTE Approval Process Handbook guidelines.",
    ),
    (
        "Hostel Amenities Coercion & Anti-Ragging Deficiencies",
        "Anti-Ragging Cell",
        "Hostel warden coercing students under guise of amenity deposit",
        "First-year hostel residents report that hostel warden in collusion with senior student committee is extorting non-refundable deposits under threat of disciplinary expulsion and harassment, creating a hostile environment on campus.",
    ),
    (
        "Faculty Salary Arrears & 7th CPC Non-Compliance",
        "Faculty & Staff Grievances Cell",
        "Non-payment of monthly salaries for consecutive months and pay-scale anomaly",
        "Assistant and Associate Professors in the Mechanical and Civil departments have not received monthly salary disbursements for 4 consecutive months. Salaries are not being paid in accordance with the 7th Central Pay Commission scales.",
    ),
    (
        "Deficient Laboratory Equipment & Safety Standards",
        "Approval Bureau",
        "Computer network and robotics laboratories non-functional despite inspection claims",
        "Robotics, IoT, and high-performance computing laboratories listed during the annual approval documentation are non-functional and lack basic power backups and licensed simulation toolkits, severely hampering mandatory lab coursework.",
    ),
    (
        "Delay in PMSSS & Technical Scholarship Disbursals",
        "Finance & Scholarships Bureau",
        "Institutional withholding of Prime Minister Special Scholarship Scheme stipend",
        "Eligible students admitted under the Prime Minister's Special Scholarship Scheme have had their maintenance allowance and hostel fee credits delayed by over six months due to administrative inaction at the institutional verification desk.",
    ),
    (
        "Refusal of Tuition Fee Refund upon Lawful Withdrawal",
        "Public Grievance Redressal Cell (PGRC)",
        "Deduction of total first-year tuition fee upon admission surrender before deadline",
        "Complainant surrendered B.Tech seat 10 days before the AICTE admission cut-off date. Institute deducted 100% of the deposited tuition fee (Rs 1,15,000) instead of the permissible processing charge of Rs 1,000.",
    ),
    (
        "Inadequate Faculty-to-Student Ratio & Ghost Faculty",
        "Approval Bureau",
        "Shortage of qualified faculty in emerging technology courses",
        "Artificial Intelligence and Data Science department operates with only 3 full-time faculty for 180 students (ratio 1:60 against the mandated 1:20). Several faculty members listed on the college portal are not actively teaching on campus.",
    ),
]

# Controlled overlap pair templates for Feature 1 (Duplicate / Cross-Bureau Matching)
CONTROLLED_OVERLAP_PAIRS = [
    {
        "pair_id": "PAIR-OVERLAP-01",
        "topic": "Arbitrary Hostel Amenities Coercion",
        "institution_index": 0,
        "case_a": {
            "bureau": "Anti-Ragging Cell",
            "category": "Hostel Amenities Coercion & Anti-Ragging Deficiencies",
            "subject": "Senior hostel committee imposing mandatory amenity extortion",
            "description": "Senior hostel residents and warden have imposed an arbitrary Rs 20,000 annual amenity fee on junior students with threats of hostel suspension and intimidation if not paid immediately.",
            "complainant_type": "Student",
            "priority": "Critical",
        },
        "case_b": {
            "bureau": "Approval Bureau",
            "category": "Excessive / Non-Sanctioned Fee Surcharges",
            "subject": "Arbitrary non-sanctioned Rs 20,000 hostel surcharge collected from students",
            "description": "College hostel administration is charging an unauthorized Rs 20,000 extra fee under the heading of special amenities surcharge, violating AICTE fee guidelines.",
            "complainant_type": "Parent",
            "priority": "High",
        },
    },
    {
        "pair_id": "PAIR-OVERLAP-02",
        "topic": "Faculty Salary Non-Disbursement",
        "institution_index": 1,
        "case_a": {
            "bureau": "Faculty & Staff Grievances Cell",
            "category": "Faculty Salary Arrears & 7th CPC Non-Compliance",
            "subject": "Non-payment of faculty salaries for five consecutive months",
            "description": "Engineering faculty members of Electronics department have not received monthly pay since May 2026. The institute has withheld 7th CPC arrears despite repeated written representations.",
            "complainant_type": "Faculty",
            "priority": "Critical",
        },
        "case_b": {
            "bureau": "Public Grievance Redressal Cell (PGRC)",
            "category": "Faculty Salary Arrears & 7th CPC Non-Compliance",
            "subject": "Electronics department staff salary unpaid causing academic disruption",
            "description": "Faculty in Electronics and Communication department have gone on mass strike due to five months of unpaid salary arrears, leading to complete suspension of classes and laboratory sessions.",
            "complainant_type": "Student",
            "priority": "High",
        },
    },
    {
        "pair_id": "PAIR-OVERLAP-03",
        "topic": "Certificate Withholding",
        "institution_index": 2,
        "case_a": {
            "bureau": "Public Grievance Redressal Cell (PGRC)",
            "category": "Withholding of Original Academic Certificates",
            "subject": "Denial of graduation degree and grade sheets until placement fine paid",
            "description": "Institute is withholding original B.Tech degree certificates and consolidated grade cards demanding an unjustified placement training fee of Rs 15,000 after course completion.",
            "complainant_type": "Student",
            "priority": "High",
        },
        "case_b": {
            "bureau": "Legal & Redressal Cell",
            "category": "Withholding of Original Academic Certificates",
            "subject": "Legal violation of AICTE norms on withholding student degree certificates",
            "description": "Notice of illegal retention of original educational documents and graduation degree by college administration demanding arbitrary post-course charges.",
            "complainant_type": "Parent",
            "priority": "Medium",
        },
    },
]


# ==============================================================================
# Synthetic Data Generator Class
# ==============================================================================

class SyntheticDataGenerator:
    """
    Generates synthetic institutions and multi-bureau complaint records with
    reproducibility and intentional overlap pairs for AICTE decision support testing.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)

    def generate_institutions(self, count: int = 30) -> List[Dict[str, Any]]:
        """
        Generate a list of fictional approved institutions across states.
        """
        institutions = []
        name_pool = list(FICTIONAL_INSTITUTION_NAMES)
        self.rng.shuffle(name_pool)

        for i in range(count):
            name = name_pool[i % len(name_pool)]
            city, state = self.rng.choice(CITIES_AND_STATES)
            # Create a deterministic 8-digit AICTE Permanent ID (e.g., 1-48291042)
            aicte_id = f"1-{10000000 + (self.seed * 31 + i * 179) % 89999999}"

            inst = {
                "id": i + 1,  # Dry-run virtual ID
                "aicte_id": aicte_id,
                "name": f"{name} (Fictional)",
                "state": state,
                "city": city,
                "address": f"Plot {100 + i}, Sector {10 + (i % 20)}, Knowledge Corridor, {city}, {state}",
                "institution_type": "Private Unaided Technical Institute" if i % 3 != 0 else "Autonomous Engineering College",
                "affiliating_university": f"{state} Technical University (Fictional)",
                "established_year": self.rng.randint(1998, 2021),
                "bureau_jurisdiction": "Approval Bureau",
                "is_active": True,
            }
            institutions.append(inst)

        return institutions

    def generate_complaints(
        self,
        institutions: List[Dict[str, Any]],
        target_count: int = 500,
        include_duplicates: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Generate realistic synthetic complaints across institutions and bureaus.
        """
        complaints: List[Dict[str, Any]] = []
        start_date = date(2026, 1, 10)
        end_date = date(2026, 10, 20)
        date_range_days = (end_date - start_date).days

        # 1. First inject controlled overlap pairs if requested
        if include_duplicates and institutions:
            complaint_counter = 1
            for pair in CONTROLLED_OVERLAP_PAIRS:
                inst = institutions[pair["institution_index"] % len(institutions)]
                filing_day_offset = self.rng.randint(30, date_range_days - 30)
                filing_date_a = start_date + timedelta(days=filing_day_offset)
                filing_date_b = filing_date_a + timedelta(days=self.rng.randint(1, 4))

                for case_key, filing_dt in [("case_a", filing_date_a), ("case_b", filing_date_b)]:
                    case_data = pair[case_key]
                    incident_date = filing_dt - timedelta(days=self.rng.randint(5, 25))
                    deadline_date = filing_dt + timedelta(days=30)
                    complaint_no = f"AICTE-2026-{complaint_counter:04d}"
                    complaint_counter += 1

                    status = self.rng.choice(["Under Review", "Evidence Requested", "Escalated", "Resolved"])
                    resolution_summary = (
                        f"Compliance proof submitted by college on {(filing_dt + timedelta(days=18)).strftime('%d-%b-%Y')}; grievance settled under officer supervision."
                        if status == "Resolved"
                        else None
                    )

                    c = {
                        "complaint_no": complaint_no,
                        "institution_id": inst["id"],
                        "institution_aicte_id": inst["aicte_id"],
                        "institution_name": inst["name"],
                        "complainant_type": case_data["complainant_type"],
                        "bureau": case_data["bureau"],
                        "category": case_data["category"],
                        "subject": f"{case_data['subject']} [SYNTHETIC TEST]",
                        "description": f"{case_data['description']} [DISCLAIMER: Fictional dataset for SIH26264 overlap testing]",
                        "priority": case_data["priority"],
                        "status": status,
                        "incident_date": incident_date,
                        "filing_date": filing_dt,
                        "deadline_date": deadline_date,
                        "assigned_to": None,
                        "resolution_summary": resolution_summary,
                        "is_escalated": case_data["priority"] in ["Critical", "Urgent"] or status == "Escalated",
                        "overlap_group_id": pair["pair_id"],
                    }
                    complaints.append(c)

        # 2. Generate remaining complaints up to target_count
        while len(complaints) < target_count:
            complaint_counter = len(complaints) + 1
            complaint_no = f"AICTE-2026-{complaint_counter:04d}"
            inst = self.rng.choice(institutions)
            topic = self.rng.choice(GRIEVANCE_TOPICS)

            filing_day_offset = self.rng.randint(0, date_range_days)
            filing_dt = start_date + timedelta(days=filing_day_offset)
            incident_date = filing_dt - timedelta(days=self.rng.randint(3, 40))
            deadline_date = filing_dt + timedelta(days=30)

            # Realistic status distribution: 55% Resolved, 25% Under Review, 10% Evidence Requested, 7% Escalated, 3% New
            status_roll = self.rng.random()
            if status_roll < 0.55:
                status = "Resolved"
            elif status_roll < 0.80:
                status = "Under Review"
            elif status_roll < 0.90:
                status = "Evidence Requested"
            elif status_roll < 0.97:
                status = "Escalated"
            else:
                status = "New"

            priority = self.rng.choice(PRIORITIES)
            complainant_type = self.rng.choice(COMPLAINANT_TYPES)

            resolution_summary = None
            if status == "Resolved":
                res_days = self.rng.randint(12, 28)
                resolution_summary = (
                    f"Official inquiry completed on {(filing_dt + timedelta(days=res_days)).strftime('%d-%b-%Y')}. "
                    f"Institution issued compliance rectifying grievance under bureau directives."
                )

            is_escalated = (priority in ["Critical", "Urgent"]) or (status == "Escalated")

            c = {
                "complaint_no": complaint_no,
                "institution_id": inst["id"],
                "institution_aicte_id": inst["aicte_id"],
                "institution_name": inst["name"],
                "complainant_type": complainant_type,
                "bureau": topic[1],
                "category": topic[0],
                "subject": f"{topic[2]} [SYNTHETIC TEST]",
                "description": f"{topic[3]} [DISCLAIMER: Fictional dataset generated for SIH26264 decision support evaluation]",
                "priority": priority,
                "status": status,
                "incident_date": incident_date,
                "filing_date": filing_dt,
                "deadline_date": deadline_date,
                "assigned_to": None,
                "resolution_summary": resolution_summary,
                "is_escalated": is_escalated,
                "overlap_group_id": None,
            }
            complaints.append(c)

        return complaints


# ==============================================================================
# Database Ingestion Routine with Duplicate Protection
# ==============================================================================

def seed_to_database(
    session: Any,
    institutions_data: List[Dict[str, Any]],
    complaints_data: List[Dict[str, Any]],
    confirm_write: bool = False,
) -> Dict[str, int]:
    """
    Safely seeds generated records to PostgreSQL using existing SQLAlchemy models.
    Guarantees duplicate protection by checking existing aicte_id and complaint_no.
    Requires confirm_write=True.
    """
    if not confirm_write:
        raise ValueError(
            "Database write aborted! confirm_write flag is False. To perform database write, pass --confirm-write."
        )

    from app.models.institution import Institution
    from app.models.complaint import Complaint

    stats = {
        "institutions_created": 0,
        "institutions_reused": 0,
        "complaints_created": 0,
        "complaints_skipped": 0,
    }

    # Step 1: Create or resolve institutions first to ensure valid foreign keys
    aicte_id_to_db_id: Dict[str, int] = {}

    for inst_data in institutions_data:
        existing = session.query(Institution).filter(Institution.aicte_id == inst_data["aicte_id"]).first()
        if existing:
            aicte_id_to_db_id[inst_data["aicte_id"]] = existing.id
            stats["institutions_reused"] += 1
        else:
            new_inst = Institution(
                aicte_id=inst_data["aicte_id"],
                name=inst_data["name"],
                state=inst_data["state"],
                city=inst_data["city"],
                address=inst_data.get("address"),
                institution_type=inst_data.get("institution_type", "Technical Institute"),
                affiliating_university=inst_data.get("affiliating_university"),
                established_year=inst_data.get("established_year"),
                bureau_jurisdiction=inst_data.get("bureau_jurisdiction", "Approval Bureau"),
                is_active=inst_data.get("is_active", True),
            )
            session.add(new_inst)
            session.flush()  # Populates new_inst.id
            aicte_id_to_db_id[inst_data["aicte_id"]] = new_inst.id
            stats["institutions_created"] += 1

    # Step 2: Insert complaints using resolved foreign keys with duplicate checking
    for c_data in complaints_data:
        existing_c = session.query(Complaint).filter(Complaint.complaint_no == c_data["complaint_no"]).first()
        if existing_c:
            stats["complaints_skipped"] += 1
            continue

        real_inst_id = aicte_id_to_db_id.get(c_data["institution_aicte_id"])
        if not real_inst_id:
            # Fallback to the first available institution
            real_inst_id = list(aicte_id_to_db_id.values())[0]

        new_complaint = Complaint(
            complaint_no=c_data["complaint_no"],
            institution_id=real_inst_id,
            complainant_type=c_data["complainant_type"],
            bureau=c_data["bureau"],
            category=c_data["category"],
            subject=c_data["subject"],
            description=c_data["description"],
            priority=c_data.get("priority", "Medium"),
            status=c_data.get("status", "New"),
            incident_date=c_data.get("incident_date"),
            filing_date=c_data.get("filing_date"),
            deadline_date=c_data.get("deadline_date"),
            assigned_to=c_data.get("assigned_to"),
            resolution_summary=c_data.get("resolution_summary"),
            is_escalated=c_data.get("is_escalated", False),
        )
        session.add(new_complaint)
        stats["complaints_created"] += 1

    session.commit()
    return stats


# ==============================================================================
# Serialization Helper for Dry-Run JSON
# ==============================================================================

def json_date_serializer(obj: Any) -> str:
    """Helper for serializing date/datetime objects to JSON."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} is not JSON serializable")


# ==============================================================================
# CLI Entrypoint
# ==============================================================================

def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SIH26264 AICTE Complaint Intelligence Synthetic Data Generator.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--count",
        type=int,
        default=500,
        help="Number of synthetic complaint records to generate.",
    )
    parser.add_argument(
        "--institutions-count",
        type=int,
        default=30,
        help="Number of fictional institutions to generate.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/synthetic_complaints.json",
        help="Output JSON filepath for dry-run inspection.",
    )
    parser.add_argument(
        "--include-duplicates",
        action="store_true",
        default=True,
        help="Inject intentional cross-bureau overlap pairs for ML testing.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for deterministic, reproducible generation.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Dry run mode (default): outputs JSON file and does NOT write to PostgreSQL.",
    )
    parser.add_argument(
        "--confirm-write",
        action="store_true",
        default=False,
        help="Explicit confirmation required to execute database writes into PostgreSQL.",
    )
    return parser.parse_args()


def main():
    args = parse_arguments()

    # Safety rule: if --confirm-write is passed, dry-run is disabled
    is_dry_run = not args.confirm_write

    print("=" * 75)
    print("SIH26264 COMPLAINT INTELLIGENCE — SYNTHETIC DATA GENERATOR")
    print("=" * 75)
    print(f"Target Complaint Count:  {args.count}")
    print(f"Fictional Institutions:  {args.institutions_count}")
    print(f"Random Seed:             {args.seed}")
    print(f"Overlap Pairs Injected:  {args.include_duplicates}")
    print(f"Execution Mode:          {'DRY-RUN (Zero DB writes)' if is_dry_run else 'ACTIVE WRITE (--confirm-write)'}")
    print("-" * 75)

    generator = SyntheticDataGenerator(seed=args.seed)
    institutions = generator.generate_institutions(count=args.institutions_count)
    complaints = generator.generate_complaints(
        institutions=institutions,
        target_count=args.count,
        include_duplicates=args.include_duplicates,
    )

    print(f"[OK] Generated {len(institutions)} fictional institutions across {len(CITIES_AND_STATES)} Indian cities/states.")
    print(f"[OK] Generated {len(complaints)} synthetic complaints across {len(BUREAUS)} AICTE bureaus/cells.")

    # Calculate brief category statistics
    cat_counts: Dict[str, int] = {}
    bureau_counts: Dict[str, int] = {}
    for c in complaints:
        cat_counts[c["category"]] = cat_counts.get(c["category"], 0) + 1
        bureau_counts[c["bureau"]] = bureau_counts.get(c["bureau"], 0) + 1

    print("\n[Distribution by Bureau]")
    for b, count in sorted(bureau_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {b:<45}: {count} cases")

    # If dry-run: write to output JSON file
    if is_dry_run:
        out_path = PROJECT_ROOT / args.output
        out_path.parent.mkdir(parents=True, exist_ok=True)

        payload = {
            "metadata": {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "generator_version": "1.0.0",
                "seed": args.seed,
                "disclaimer": "All institutions, persons, and complaints are synthetic and fictional.",
                "total_institutions": len(institutions),
                "total_complaints": len(complaints),
            },
            "institutions": institutions,
            "complaints": complaints,
        }

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, default=json_date_serializer)

        print(f"\n[DRY-RUN COMPLETE] Saved {len(complaints)} records to: {out_path}")
        print("[DRY-RUN NOTE] Zero database records were inserted or modified.")
        print("[DATABASE WRITE COMMAND] To seed records into PostgreSQL, run:")
        print(f"    python scripts/generate_synthetic_data.py --count {args.count} --confirm-write")
        return 0

    # If confirm-write is explicitly provided:
    print("\n[WRITING TO DATABASE] Connecting via existing SQLAlchemy session...")
    from app.core.database import SessionLocal

    session = SessionLocal()
    try:
        stats = seed_to_database(
            session=session,
            institutions_data=institutions,
            complaints_data=complaints,
            confirm_write=True,
        )
        print(f"[DATABASE SEED COMPLETE] Results:")
        print(f"  • Institutions Created: {stats['institutions_created']}")
        print(f"  • Institutions Reused:  {stats['institutions_reused']}")
        print(f"  • Complaints Created:   {stats['complaints_created']}")
        print(f"  • Complaints Skipped:   {stats['complaints_skipped']}")
    except Exception as e:
        session.rollback()
        logger.error(f"Database write failed: {e}", exc_info=True)
        return 1
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
