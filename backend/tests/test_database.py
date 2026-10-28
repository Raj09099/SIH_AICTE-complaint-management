"""
Unit tests for SQLAlchemy 2.x models metadata and session dependency behavior.
Does NOT require a live PostgreSQL database connection.
"""

from unittest.mock import MagicMock, patch
import pytest

try:
    from app.core.database import Base, engine, get_database_url
    from app.dependencies import get_db
    from app.models import (
        CaseOverlap,
        Complaint,
        Institution,
        ProblemPattern,
        ResolutionEvidence,
        User,
    )
    HAS_SQLALCHEMY = True
except ImportError:
    HAS_SQLALCHEMY = False


@pytest.mark.skipif(not HAS_SQLALCHEMY, reason="SQLAlchemy not installed in test environment")
class TestDatabaseConfiguration:
    def test_database_url_formatting(self):
        """Verify get_database_url correctly handles postgres:// and postgresql:// prefixes."""
        with patch("app.core.config.settings.DATABASE_URL", "postgres://user:pass@localhost:5432/db"):
            assert get_database_url() == "postgresql://user:pass@localhost:5432/db"

        with patch("app.core.config.settings.DATABASE_URL", "postgresql+psycopg2://user:pass@localhost:5432/db"):
            assert get_database_url() == "postgresql+psycopg2://user:pass@localhost:5432/db"

    def test_engine_initialization(self):
        """Verify engine is created with proper pool parameters without opening connections."""
        assert engine is not None
        assert hasattr(engine, "pool")


@pytest.mark.skipif(not HAS_SQLALCHEMY, reason="SQLAlchemy not installed in test environment")
class TestModelMetadata:
    """Verify table names and model inheritance match Base."""

    def test_all_models_registered_in_metadata(self):
        expected_tables = {
            "institutions",
            "users",
            "complaints",
            "case_overlaps",
            "problem_patterns",
            "resolution_evidence",
        }
        assert expected_tables.issubset(set(Base.metadata.tables.keys()))

    def test_institutions_table_columns_and_constraints(self):
        table = Base.metadata.tables["institutions"]
        expected_columns = {
            "id",
            "aicte_id",
            "name",
            "state",
            "city",
            "address",
            "institution_type",
            "affiliating_university",
            "established_year",
            "bureau_jurisdiction",
            "is_active",
            "created_at",
            "updated_at",
        }
        assert set(table.columns.keys()) == expected_columns
        assert table.columns["id"].primary_key is True
        assert table.columns["aicte_id"].unique is True
        assert table.columns["aicte_id"].nullable is False
        assert table.columns["name"].nullable is False
        assert table.columns["state"].nullable is False
        assert table.columns["city"].nullable is False

        # Indexes
        index_names = {idx.name for idx in table.indexes}
        assert "idx_institutions_aicte_id" in index_names
        assert "idx_institutions_state" in index_names

    def test_users_table_columns_and_constraints(self):
        table = Base.metadata.tables["users"]
        expected_columns = {
            "id",
            "email",
            "hashed_password",
            "full_name",
            "bureau",
            "role",
            "designation",
            "is_active",
            "created_at",
            "updated_at",
        }
        assert set(table.columns.keys()) == expected_columns
        assert table.columns["id"].primary_key is True
        assert table.columns["email"].unique is True
        assert table.columns["email"].nullable is False
        assert table.columns["hashed_password"].nullable is False
        assert table.columns["full_name"].nullable is False
        assert table.columns["bureau"].nullable is False

        # Indexes
        index_names = {idx.name for idx in table.indexes}
        assert "idx_users_bureau" in index_names

    def test_complaints_table_columns_and_foreign_keys(self):
        table = Base.metadata.tables["complaints"]
        expected_columns = {
            "id",
            "complaint_no",
            "institution_id",
            "complainant_type",
            "bureau",
            "category",
            "subject",
            "description",
            "priority",
            "status",
            "incident_date",
            "filing_date",
            "deadline_date",
            "assigned_to",
            "resolution_summary",
            "is_escalated",
            "created_at",
            "updated_at",
        }
        assert set(table.columns.keys()) == expected_columns
        assert table.columns["id"].primary_key is True
        assert table.columns["complaint_no"].unique is True
        assert table.columns["complaint_no"].nullable is False
        assert table.columns["institution_id"].nullable is False

        # Foreign keys
        fks = {fk.target_fullname: fk for fk in table.foreign_keys}
        assert "institutions.id" in fks
        assert fks["institutions.id"].ondelete.upper() == "CASCADE"
        assert "users.id" in fks
        assert fks["users.id"].ondelete.upper() == "SET NULL"

        # Indexes
        index_names = {idx.name for idx in table.indexes}
        assert "idx_complaints_no" in index_names
        assert "idx_complaints_institution_id" in index_names
        assert "idx_complaints_bureau" in index_names
        assert "idx_complaints_status" in index_names
        assert "idx_complaints_category" in index_names

    def test_case_overlaps_table_columns_and_foreign_keys(self):
        table = Base.metadata.tables["case_overlaps"]
        expected_columns = {
            "id",
            "primary_complaint_id",
            "related_complaint_id",
            "similarity_score",
            "overlap_type",
            "reason",
            "matching_keywords",
            "status",
            "reviewed_by",
            "reviewed_at",
            "created_at",
        }
        assert set(table.columns.keys()) == expected_columns
        assert table.columns["id"].primary_key is True
        assert table.columns["primary_complaint_id"].nullable is False
        assert table.columns["related_complaint_id"].nullable is False
        assert table.columns["similarity_score"].nullable is False

        # Foreign keys
        fk_targets = {fk.target_fullname: fk for fk in table.foreign_keys}
        assert "complaints.id" in fk_targets
        assert "users.id" in fk_targets

        # Composite index on pair
        index_names = {idx.name for idx in table.indexes}
        assert "idx_case_overlaps_pair" in index_names

    def test_problem_patterns_table_columns(self):
        table = Base.metadata.tables["problem_patterns"]
        expected_columns = {
            "id",
            "pattern_code",
            "title",
            "category",
            "bureau",
            "state",
            "affected_institutions_count",
            "complaint_count",
            "description",
            "sample_complaint_ids",
            "cluster_score",
            "status",
            "created_at",
            "updated_at",
        }
        assert set(table.columns.keys()) == expected_columns
        assert table.columns["id"].primary_key is True
        assert table.columns["pattern_code"].unique is True
        assert table.columns["pattern_code"].nullable is False
        assert table.columns["title"].nullable is False
        assert table.columns["category"].nullable is False

        # Indexes
        index_names = {idx.name for idx in table.indexes}
        assert "idx_patterns_category" in index_names

    def test_resolution_evidence_table_columns_and_foreign_keys(self):
        table = Base.metadata.tables["resolution_evidence"]
        expected_columns = {
            "id",
            "complaint_id",
            "filename",
            "file_path",
            "file_size_bytes",
            "mime_type",
            "extracted_text",
            "relevance_score",
            "relevance_breakdown",
            "human_verified",
            "reviewer_decision",
            "verification_notes",
            "reviewed_by",
            "created_at",
        }
        assert set(table.columns.keys()) == expected_columns
        assert table.columns["id"].primary_key is True
        assert table.columns["complaint_id"].nullable is False
        assert table.columns["filename"].nullable is False
        assert table.columns["file_path"].nullable is False

        # Foreign keys
        fk_targets = {fk.target_fullname: fk for fk in table.foreign_keys}
        assert "complaints.id" in fk_targets
        assert fk_targets["complaints.id"].ondelete.upper() == "CASCADE"
        assert "users.id" in fk_targets
        assert fk_targets["users.id"].ondelete.upper() == "SET NULL"

        # Indexes
        index_names = {idx.name for idx in table.indexes}
        assert "idx_evidence_complaint_id" in index_names


@pytest.mark.skipif(not HAS_SQLALCHEMY, reason="SQLAlchemy not installed in test environment")
class TestModelRelationships:
    """Verify bidirectional ORM relationship attributes."""

    def test_relationships_defined_on_models(self):
        assert hasattr(Institution, "complaints")
        assert hasattr(User, "assigned_complaints")
        assert hasattr(User, "reviewed_overlaps")
        assert hasattr(User, "reviewed_evidences")
        assert hasattr(Complaint, "institution")
        assert hasattr(Complaint, "assignee")
        assert hasattr(Complaint, "primary_overlaps")
        assert hasattr(Complaint, "related_overlaps")
        assert hasattr(Complaint, "evidences")
        assert hasattr(CaseOverlap, "primary_complaint")
        assert hasattr(CaseOverlap, "related_complaint")
        assert hasattr(CaseOverlap, "reviewer")
        assert hasattr(ResolutionEvidence, "complaint")
        assert hasattr(ResolutionEvidence, "reviewer")


@pytest.mark.skipif(not HAS_SQLALCHEMY, reason="SQLAlchemy not installed in test environment")
class TestSessionDependency:
    """Verify get_db session lifecycle management."""

    def test_get_db_yields_session_and_closes_normally(self):
        mock_session = MagicMock()
        with patch("app.dependencies.SessionLocal", return_value=mock_session):
            gen = get_db()
            db = next(gen)
            assert db == mock_session
            mock_session.close.assert_not_called()

            # Completing generator triggers finally block
            with pytest.raises(StopIteration):
                next(gen)
            mock_session.close.assert_called_once()

    def test_get_db_closes_session_on_exception(self):
        mock_session = MagicMock()
        with patch("app.dependencies.SessionLocal", return_value=mock_session):
            gen = get_db()
            db = next(gen)
            assert db == mock_session

            # Simulate exception during request processing
            with pytest.raises(RuntimeError):
                gen.throw(RuntimeError("Simulated request failure"))

            # Session must still be closed in finally block
            mock_session.close.assert_called_once()

