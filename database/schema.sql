-- ==============================================================================
-- SIH26264 AICTE Complaint Intelligence Database Schema (PostgreSQL)
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    aicte_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    institution_type VARCHAR(100) DEFAULT 'Technical Institute',
    affiliating_university VARCHAR(255),
    established_year INTEGER,
    bureau_jurisdiction VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_institutions_aicte_id ON institutions (aicte_id);
CREATE INDEX IF NOT EXISTS idx_institutions_state ON institutions (state);

-- 2. USERS TABLE (AICTE Bureau Officers & Admins)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    bureau VARCHAR(100) NOT NULL, -- e.g. 'Approval Bureau', 'Anti-Ragging Cell', 'Faculty & Staff'
    role VARCHAR(50) DEFAULT 'officer', -- 'admin', 'bureau_head', 'officer', 'viewer'
    designation VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_bureau ON users (bureau);

-- 3. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    complaint_no VARCHAR(50) UNIQUE NOT NULL,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    complainant_type VARCHAR(50) NOT NULL, -- 'Student', 'Faculty', 'Parent', 'Anonymous', 'Public'
    bureau VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Fee Overcharging', 'Faculty Salaries', 'Anti-Ragging', 'Infrastructure Deficit', etc.
    subject VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status VARCHAR(50) DEFAULT 'New', -- 'New', 'Under Review', 'Evidence Requested', 'Resolved', 'Escalated'
    incident_date DATE,
    filing_date DATE DEFAULT CURRENT_DATE,
    deadline_date DATE,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_summary TEXT,
    is_escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_complaints_no ON complaints (complaint_no);
CREATE INDEX IF NOT EXISTS idx_complaints_institution_id ON complaints (institution_id);
CREATE INDEX IF NOT EXISTS idx_complaints_bureau ON complaints (bureau);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints (category);

-- 4. CASE OVERLAPS TABLE (Feature 1: Relationship & Duplicate Detection)
CREATE TABLE IF NOT EXISTS case_overlaps (
    id SERIAL PRIMARY KEY,
    primary_complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    related_complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5, 4) NOT NULL, -- e.g. 0.8750
    overlap_type VARCHAR(50) DEFAULT 'Semantic Duplicate', -- 'Exact Duplicate', 'Semantic Duplicate', 'Cross-Bureau Related', 'Multiple Complainant Same Incident'
    reason TEXT,
    matching_keywords TEXT[],
    status VARCHAR(50) DEFAULT 'Flagged', -- 'Flagged', 'Confirmed Linked', 'Dismissed'
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_overlaps_pair ON case_overlaps (primary_complaint_id, related_complaint_id);

-- 5. PROBLEM PATTERNS TABLE (Feature 2: Multi-Institution Pattern Detector)
CREATE TABLE IF NOT EXISTS problem_patterns (
    id SERIAL PRIMARY KEY,
    pattern_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    bureau VARCHAR(100),
    state VARCHAR(100),
    affected_institutions_count INTEGER DEFAULT 1,
    complaint_count INTEGER DEFAULT 1,
    description TEXT,
    sample_complaint_ids INTEGER[],
    cluster_score NUMERIC(5, 4),
    status VARCHAR(50) DEFAULT 'Active', -- 'Active', 'Under Investigation', 'Advisory Issued', 'Resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patterns_category ON problem_patterns (category);

-- 6. RESOLUTION EVIDENCE TABLE (Feature 3: Evidence Relevance Checker)
CREATE TABLE IF NOT EXISTS resolution_evidence (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100) DEFAULT 'application/pdf',
    extracted_text TEXT,
    relevance_score NUMERIC(5, 4), -- e.g. 0.7450
    relevance_breakdown JSONB, -- stores key terms matched, missing requirements, etc.
    human_verified BOOLEAN DEFAULT FALSE,
    reviewer_decision VARCHAR(50), -- 'Accepted', 'Rejected', 'Needs Clarification'
    verification_notes TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_complaint_id ON resolution_evidence (complaint_id);
