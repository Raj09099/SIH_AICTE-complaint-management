"""
Structural and AST-based unit tests for database foundation.
Validates code structure, imports, classes, table names, attributes,
and session management without requiring SQLAlchemy or a database.
"""

import ast
import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BACKEND_DIR / "app" / "models"
CORE_DIR = BACKEND_DIR / "app" / "core"


def parse_module(file_path: Path) -> ast.Module:
    with open(file_path, "r", encoding="utf-8") as f:
        return ast.parse(f.read(), filename=str(file_path))


class TestDatabaseStructure:
    def test_database_py_exists_and_defines_components(self):
        db_file = CORE_DIR / "database.py"
        assert db_file.exists(), "backend/app/core/database.py must exist"
        tree = parse_module(db_file)

        names = {node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.ClassDef))}
        assigned = set()
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        assigned.add(target.id)
            elif isinstance(node, ast.AnnAssign):
                if isinstance(node.target, ast.Name):
                    assigned.add(node.target.id)

        all_symbols = names | assigned
        assert "Base" in all_symbols, "Base declarative base must be defined"
        assert "engine" in all_symbols, "engine must be defined"
        assert "SessionLocal" in all_symbols, "SessionLocal sessionmaker must be defined"
        assert "get_database_url" in all_symbols, "get_database_url helper must be defined"

    def test_all_six_models_exist(self):
        expected_files = [
            "institution.py",
            "user.py",
            "complaint.py",
            "case_overlap.py",
            "problem_pattern.py",
            "resolution_evidence.py",
        ]
        for f in expected_files:
            p = MODELS_DIR / f
            assert p.exists(), f"Model file {f} must exist in backend/app/models/"
            # Verify it parses cleanly without syntax errors
            tree = parse_module(p)
            assert isinstance(tree, ast.Module)

    def test_models_package_exports_all_six_classes(self):
        init_file = MODELS_DIR / "__init__.py"
        assert init_file.exists()
        tree = parse_module(init_file)

        # Look for __all__ assignment
        all_exports = []
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "__all__":
                        if isinstance(node.value, (ast.List, ast.Tuple)):
                            all_exports = [
                                elt.value for elt in node.value.elts if isinstance(elt, ast.Constant)
                            ]

        expected_exports = {
            "Institution",
            "User",
            "Complaint",
            "CaseOverlap",
            "ProblemPattern",
            "ResolutionEvidence",
        }
        assert expected_exports.issubset(set(all_exports))

    def test_model_table_names(self):
        model_tables = {
            "institution.py": ("Institution", "institutions"),
            "user.py": ("User", "users"),
            "complaint.py": ("Complaint", "complaints"),
            "case_overlap.py": ("CaseOverlap", "case_overlaps"),
            "problem_pattern.py": ("ProblemPattern", "problem_patterns"),
            "resolution_evidence.py": ("ResolutionEvidence", "resolution_evidence"),
        }

        for filename, (class_name, table_name) in model_tables.items():
            tree = parse_module(MODELS_DIR / filename)
            found_class = False
            for node in tree.body:
                if isinstance(node, ast.ClassDef) and node.name == class_name:
                    found_class = True
                    # Check __tablename__
                    found_tablename = False
                    for item in node.body:
                        if isinstance(item, ast.Assign):
                            for target in item.targets:
                                if isinstance(target, ast.Name) and target.id == "__tablename__":
                                    if isinstance(item.value, ast.Constant):
                                        assert item.value.value == table_name
                                        found_tablename = True
                    assert found_tablename, f"__tablename__ = '{table_name}' not found in {class_name}"
            assert found_class, f"Class {class_name} not found in {filename}"

    def test_dependencies_get_db_structure(self):
        dep_file = BACKEND_DIR / "app" / "dependencies.py"
        assert dep_file.exists()
        tree = parse_module(dep_file)

        get_db_func = None
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name == "get_db":
                get_db_func = node
                break

        assert get_db_func is not None, "get_db function must exist in dependencies.py"

        # Check for try/finally block in get_db
        has_try_finally = False
        has_yield = False
        has_close = False

        for stmt in ast.walk(get_db_func):
            if isinstance(stmt, ast.Try) and stmt.finalbody:
                has_try_finally = True
                for fin_stmt in stmt.finalbody:
                    if isinstance(fin_stmt, ast.Expr) and isinstance(fin_stmt.value, ast.Call):
                        call = fin_stmt.value
                        if isinstance(call.func, ast.Attribute) and call.func.attr == "close":
                            has_close = True
            if isinstance(stmt, ast.Yield):
                has_yield = True

        assert has_try_finally, "get_db must use a try...finally block"
        assert has_yield, "get_db must yield a database session"
        assert has_close, "get_db must call .close() in the finally block"


class TestSessionLifecycleMocked:
    """
    Test session lifecycle and URL formatting at runtime even when
    sqlalchemy binary wheels are pending installation in the virtualenv.
    """

    def test_get_database_url_formatting(self):
        import sys
        from unittest.mock import MagicMock, patch

        # Mock sqlalchemy if not present
        if "sqlalchemy" not in sys.modules:
            for mod in [
                "sqlalchemy",
                "sqlalchemy.engine",
                "sqlalchemy.orm",
                "sqlalchemy.dialects",
                "sqlalchemy.dialects.postgresql",
            ]:
                sys.modules[mod] = MagicMock()
            class DeclarativeBase:
                pass
            sys.modules["sqlalchemy.orm"].DeclarativeBase = DeclarativeBase

        from app.core.database import get_database_url

        with patch("app.core.config.settings.DATABASE_URL", "postgres://user:pass@localhost:5432/aicte"):
            assert get_database_url() == "postgresql://user:pass@localhost:5432/aicte"

        with patch("app.core.config.settings.DATABASE_URL", "postgresql+psycopg2://user:pass@localhost:5432/aicte"):
            assert get_database_url() == "postgresql+psycopg2://user:pass@localhost:5432/aicte"

    def test_get_db_session_lifecycle_guarantees_closure(self):
        import sys
        from unittest.mock import MagicMock, patch
        import pytest

        # Mock sqlalchemy if not present
        if "sqlalchemy" not in sys.modules:
            for mod in [
                "sqlalchemy",
                "sqlalchemy.engine",
                "sqlalchemy.orm",
                "sqlalchemy.dialects",
                "sqlalchemy.dialects.postgresql",
            ]:
                sys.modules[mod] = MagicMock()
            class DeclarativeBase:
                pass
            sys.modules["sqlalchemy.orm"].DeclarativeBase = DeclarativeBase

        from app.dependencies import get_db

        mock_session = MagicMock()
        with patch("app.dependencies.SessionLocal", return_value=mock_session):
            gen = get_db()
            db = next(gen)
            assert db == mock_session
            mock_session.close.assert_not_called()

            with pytest.raises(StopIteration):
                next(gen)
            mock_session.close.assert_called_once()

    def test_get_db_session_closes_on_error(self):
        import sys
        from unittest.mock import MagicMock, patch
        import pytest

        if "sqlalchemy" not in sys.modules:
            for mod in [
                "sqlalchemy",
                "sqlalchemy.engine",
                "sqlalchemy.orm",
                "sqlalchemy.dialects",
                "sqlalchemy.dialects.postgresql",
            ]:
                sys.modules[mod] = MagicMock()
            class DeclarativeBase:
                pass
            sys.modules["sqlalchemy.orm"].DeclarativeBase = DeclarativeBase

        from app.dependencies import get_db

        mock_session = MagicMock()
        with patch("app.dependencies.SessionLocal", return_value=mock_session):
            gen = get_db()
            db = next(gen)
            assert db == mock_session

            with pytest.raises(ValueError):
                gen.throw(ValueError("DB operation failed"))
            mock_session.close.assert_called_once()
