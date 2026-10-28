"""
Unit and integration tests for the synthetic data generator.
Verifies record counts, foreign key mapping, reproducibility, duplicate protection,
and dry-run safety using isolated SQLite in-memory sessions.
Guarantees zero mutation to live production/Supabase databases.
"""

import sys
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure scripts and backend directories are resolvable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
BACKEND_DIR = PROJECT_ROOT / "backend"

for p in [str(PROJECT_ROOT), str(SCRIPTS_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from scripts.generate_synthetic_data import (
    SyntheticDataGenerator,
    seed_to_database,
    parse_arguments,
)
from app.models.institution import Institution
from app.models.user import User
from app.models.complaint import Complaint


@pytest.fixture
def sqlite_session():
    """
    Creates an isolated in-memory SQLite database and session.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Institution.__table__.create(engine)
    User.__table__.create(engine)
    Complaint.__table__.create(engine)

    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Complaint.__table__.drop(engine)
        User.__table__.drop(engine)
        Institution.__table__.drop(engine)


class TestSyntheticDataGenerator:
    def test_default_counts_and_structure(self):
        """Verify default 500 complaints and 30 institutions generation."""
        gen = SyntheticDataGenerator(seed=42)
        institutions = gen.generate_institutions(count=30)
        assert len(institutions) == 30

        complaints = gen.generate_complaints(institutions, target_count=500)
        assert len(complaints) == 500

        # Verify structure of institution
        inst = institutions[0]
        assert "aicte_id" in inst
        assert "name" in inst
        assert "state" in inst
        assert "city" in inst
        assert "(Fictional)" in inst["name"]

        # Verify structure of complaint
        c = complaints[0]
        assert "complaint_no" in c
        assert "institution_id" in c
        assert "institution_aicte_id" in c
        assert "bureau" in c
        assert "category" in c
        assert "subject" in c
        assert "description" in c
        assert "priority" in c
        assert "status" in c
        assert "filing_date" in c
        assert "deadline_date" in c
        assert "[DISCLAIMER" in c["description"]

    def test_reproducibility_with_seed(self):
        """Verify identical seed produces identical datasets."""
        gen1 = SyntheticDataGenerator(seed=123)
        inst1 = gen1.generate_institutions(count=10)
        comp1 = gen1.generate_complaints(inst1, target_count=20)

        gen2 = SyntheticDataGenerator(seed=123)
        inst2 = gen2.generate_institutions(count=10)
        comp2 = gen2.generate_complaints(inst2, target_count=20)

        assert [i["aicte_id"] for i in inst1] == [i["aicte_id"] for i in inst2]
        assert [c["complaint_no"] for c in comp1] == [c["complaint_no"] for c in comp2]
        assert [c["description"] for c in comp1] == [c["description"] for c in comp2]

        # Different seed produces different results
        gen3 = SyntheticDataGenerator(seed=999)
        inst3 = gen3.generate_institutions(count=10)
        assert [i["aicte_id"] for i in inst1] != [i["aicte_id"] for i in inst3]

    def test_foreign_key_references(self):
        """Verify all complaints map to existing institution AICTE IDs."""
        gen = SyntheticDataGenerator(seed=42)
        institutions = gen.generate_institutions(count=15)
        inst_aicte_ids = {i["aicte_id"] for i in institutions}

        complaints = gen.generate_complaints(institutions, target_count=100)
        for c in complaints:
            assert c["institution_aicte_id"] in inst_aicte_ids

    def test_controlled_overlap_pairs(self):
        """Verify intentional overlap pairs are injected with overlap_group_id."""
        gen = SyntheticDataGenerator(seed=42)
        institutions = gen.generate_institutions(count=10)
        complaints = gen.generate_complaints(institutions, target_count=50, include_duplicates=True)

        paired_complaints = [c for c in complaints if c.get("overlap_group_id")]
        assert len(paired_complaints) >= 4

        # Group by pair_id
        groups = {}
        for c in paired_complaints:
            gid = c["overlap_group_id"]
            groups.setdefault(gid, []).append(c)

        for gid, pair_cases in groups.items():
            assert len(pair_cases) == 2
            # Both cases in pair must refer to the same institution
            assert pair_cases[0]["institution_aicte_id"] == pair_cases[1]["institution_aicte_id"]

    def test_dry_run_protection(self):
        """Verify seed_to_database raises ValueError if confirm_write=False."""
        gen = SyntheticDataGenerator(seed=42)
        inst = gen.generate_institutions(count=2)
        comp = gen.generate_complaints(inst, target_count=5)

        with pytest.raises(ValueError, match="confirm_write flag is False"):
            seed_to_database(session=None, institutions_data=inst, complaints_data=comp, confirm_write=False)

    def test_database_seeding_and_duplicate_protection(self, sqlite_session):
        """Verify seed_to_database inserts records and idempotently skips duplicates."""
        gen = SyntheticDataGenerator(seed=42)
        institutions = gen.generate_institutions(count=5)
        complaints = gen.generate_complaints(institutions, target_count=15)

        # First write: inserts 5 institutions and 15 complaints
        stats1 = seed_to_database(
            session=sqlite_session,
            institutions_data=institutions,
            complaints_data=complaints,
            confirm_write=True,
        )
        assert stats1["institutions_created"] == 5
        assert stats1["institutions_reused"] == 0
        assert stats1["complaints_created"] == 15
        assert stats1["complaints_skipped"] == 0

        # Query database to confirm insertion
        inst_count = sqlite_session.query(Institution).count()
        comp_count = sqlite_session.query(Complaint).count()
        assert inst_count == 5
        assert comp_count == 15

        # Second write with same data: duplicate protection must reuse institutions and skip complaints!
        stats2 = seed_to_database(
            session=sqlite_session,
            institutions_data=institutions,
            complaints_data=complaints,
            confirm_write=True,
        )
        assert stats2["institutions_created"] == 0
        assert stats2["institutions_reused"] == 5
        assert stats2["complaints_created"] == 0
        assert stats2["complaints_skipped"] == 15

        # Counts must NOT have doubled
        assert sqlite_session.query(Institution).count() == 5
        assert sqlite_session.query(Complaint).count() == 15

