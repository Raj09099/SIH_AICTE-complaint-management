"""
Database migration script for Feature: Institutional Compliance & Complaint Status Notifications.
Creates:
1. institutional_compliances table
2. compliance_documents table
3. adds institution_id to notifications table
Seeds initial statutory requirements for institutions.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    statements = [
        # 1. institutional_compliances table
        """
        CREATE TABLE IF NOT EXISTS institutional_compliances (
            id SERIAL PRIMARY KEY,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            requirement_name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            due_date DATE NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'Pending',
            priority VARCHAR(20) NOT NULL DEFAULT 'High',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_inst_compliance_inst_id ON institutional_compliances(institution_id);",
        "CREATE INDEX IF NOT EXISTS idx_inst_compliance_due_date ON institutional_compliances(due_date);",
        "CREATE INDEX IF NOT EXISTS idx_inst_compliance_status ON institutional_compliances(status);",

        # 2. compliance_documents table
        """
        CREATE TABLE IF NOT EXISTS compliance_documents (
            id SERIAL PRIMARY KEY,
            compliance_id INTEGER NOT NULL REFERENCES institutional_compliances(id) ON DELETE CASCADE,
            institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(100) NOT NULL,
            file_size INTEGER NOT NULL,
            storage_path VARCHAR(500) NOT NULL,
            remarks TEXT,
            submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            verification_status VARCHAR(50) NOT NULL DEFAULT 'Verified'
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_comp_docs_comp_id ON compliance_documents(compliance_id);",
        "CREATE INDEX IF NOT EXISTS idx_comp_docs_inst_id ON compliance_documents(institution_id);",

        # 3. Add institution_id to notifications table if not exists
        """
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE;
        """,
        "CREATE INDEX IF NOT EXISTS idx_notifications_institution_id ON notifications(institution_id);",
    ]

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        print("Schema tables and columns verified/created successfully!")

        # 4. Check if institutional_compliances has data for institution 1 (Apex Institute)
        count = conn.execute(text("SELECT COUNT(*) FROM institutional_compliances WHERE institution_id = 1;")).scalar()
        if count == 0:
            print("Seeding standard statutory compliance requirements for Institution #1 (Apex Institute)...")
            seed_sql = """
            INSERT INTO institutional_compliances (institution_id, requirement_name, category, description, due_date, status, priority)
            VALUES 
            (1, 'AICTE Annual Mandatory Disclosure (APH Norms 2026)', 'Statutory Affidavit', 'Public disclosure of campus faculty cadre, laboratory infrastructure, intake capacity and accreditation credentials on official website.', CURRENT_DATE + INTERVAL '14 days', 'Pending', 'Urgent'),
            (1, 'Faculty Cadre Ratio & 7th Pay Commission Scale Affidavit', 'Curriculum & Faculty Norms', 'Notarized compliance affidavit certifying 1:15 student-faculty ratio and full disbursement of statutory 7th CPC pay scales.', CURRENT_DATE - INTERVAL '5 days', 'Overdue', 'High'),
            (1, 'Campus Anti-Ragging Committee & Squad Constitution Notification', 'Governance & Redressal', 'Submission of Anti-Ragging Committee composition, contact directories, and student undertaking records.', CURRENT_DATE + INTERVAL '3 days', 'Pending', 'Urgent'),
            (1, 'Municipal Fire Safety & Environmental Sanitation Certificate', 'Infrastructure & Safety', 'Renewal of valid municipal No Objection Certificate (NOC) and structural stability clearance.', CURRENT_DATE + INTERVAL '45 days', 'Pending', 'Medium'),
            (1, 'Student Grievance Redressal Committee (SGRC) Registry Linkage', 'Governance & Redressal', 'Integration of institutional grievance redressal ombudsman records with AICTE Central Redressal Grid.', CURRENT_DATE - INTERVAL '12 days', 'Completed', 'High'),
            (1, 'Tuition & Fee Regulatory Authority (FRA) Sanctioned Fee Schedule', 'Fee & Financial Transparency', 'Uploading FRA sanctioned fee notification and bank receipt template to prevent capitation / unauthorized surcharges.', CURRENT_DATE + INTERVAL '28 days', 'Pending', 'High');
            """
            conn.execute(text(seed_sql))
            print("Seeded 6 compliance requirements for Institution #1.")

        # Check document seeding
        doc_count = conn.execute(text("SELECT COUNT(*) FROM compliance_documents WHERE institution_id = 1;")).scalar()
        if doc_count == 0:
            comp_id = conn.execute(text("SELECT id FROM institutional_compliances WHERE institution_id = 1 AND status = 'Completed' LIMIT 1;")).scalar()
            if comp_id:
                conn.execute(text("""
                INSERT INTO compliance_documents (compliance_id, institution_id, file_name, file_type, file_size, storage_path, remarks, submitted_by, verification_status)
                VALUES (:cid, 1, 'SGRC_Gazette_Notification_2026.pdf', 'application/pdf', 142850, 'uploads/compliance/1/SGRC_Gazette_Notification_2026.pdf', 'Official institute gazette notification appointing student ombudsman.', 22, 'Verified');
                """), {"cid": comp_id})
                print("Seeded 1 verified submission document for Institution #1.")

        # Populate institution_id on existing notifications where complaint has institution_id
        conn.execute(text("""
        UPDATE notifications n
        SET institution_id = c.institution_id
        FROM complaints c
        WHERE n.complaint_id = c.id AND n.institution_id IS NULL;
        """))
        print("Updated existing notifications with institution_id where linked to complaints.")

if __name__ == "__main__":
    migrate()

