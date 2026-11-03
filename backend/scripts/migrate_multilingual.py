import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    statements = [
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10) DEFAULT 'en';",
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS translated_subject VARCHAR(300);",
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS translated_description TEXT;",
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS translation_status VARCHAR(30) DEFAULT 'original';",
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS translation_provider VARCHAR(50) DEFAULT 'internal_indic';",
        "ALTER TABLE complaints ADD COLUMN IF NOT EXISTS translated_at TIMESTAMP WITH TIME ZONE;",
        """
        UPDATE complaints 
        SET detected_language = 'en',
            translated_subject = subject,
            translated_description = description,
            translation_status = 'original',
            translation_provider = 'internal_indic',
            translated_at = CURRENT_TIMESTAMP
        WHERE detected_language IS NULL OR translated_subject IS NULL;
        """
    ]
    
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        res = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'complaints' 
              AND (column_name LIKE '%translat%' OR column_name = 'detected_language')
            ORDER BY ordinal_position;
        """)).fetchall()
        print("Migration succeeded! Multilingual columns in complaints table:")
        for r in res:
            print(f" - {r[0]}: {r[1]}")

if __name__ == "__main__":
    migrate()
