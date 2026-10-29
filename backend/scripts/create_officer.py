"""
Secure Officer Provisioning Utility for SIH26264 AICTE Complaint Intelligence.
Allows authorized administrators to create or activate an institutional officer account.

Usage:
    python scripts/create_officer.py --email officer@aicte-india.org --password <SECURE_PASSWORD> --name "Dr. R. K. Sharma" --bureau "Approval Bureau" --role officer
"""

import argparse
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules import properly
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def provision_officer(
    email: str,
    password: str,
    full_name: str,
    bureau: str,
    role: str = "officer",
    designation: str = "AICTE Case Officer",
):
    clean_email = email.strip().lower()
    if not clean_email or "@" not in clean_email:
        print("Error: A valid official email address is required.", file=sys.stderr)
        sys.exit(1)

    if len(password) < 6:
        print("Error: Password must be at least 6 characters long.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email.ilike(clean_email)).first()
        hashed = get_password_hash(password)

        if existing_user:
            print(f"Updating existing user record #{existing_user.id} ({clean_email})...")
            existing_user.full_name = full_name
            existing_user.hashed_password = hashed
            existing_user.bureau = bureau
            existing_user.role = role
            existing_user.designation = designation
            existing_user.is_active = True
            db.commit()
            print(f"Account for '{clean_email}' successfully activated with role '{role}'.")
        else:
            print(f"Creating new officer record for {clean_email}...")
            new_user = User(
                email=clean_email,
                hashed_password=hashed,
                full_name=full_name,
                bureau=bureau,
                role=role,
                designation=designation,
                is_active=True,
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            print(f"Officer account #{new_user.id} ('{clean_email}') successfully created.")
    except Exception as e:
        db.rollback()
        print(f"Error provisioning user account: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Provision an AICTE officer account.")
    parser.add_argument("--email", required=True, help="Official officer email address")
    parser.add_argument("--password", required=True, help="Account password (min 6 chars)")
    parser.add_argument("--name", default="Authorized AICTE Official", help="Officer full name")
    parser.add_argument("--bureau", default="Central Grievance Redressal Cell", help="AICTE bureau or cell")
    parser.add_argument("--role", default="officer", choices=["officer", "admin", "bureau_head", "institute", "viewer"], help="User role")
    parser.add_argument("--designation", default="AICTE Case Officer", help="Official designation")

    args = parser.parse_args()
    provision_officer(
        email=args.email,
        password=args.password,
        full_name=args.name,
        bureau=args.bureau,
        role=args.role,
        designation=args.designation,
    )


if __name__ == "__main__":
    main()

