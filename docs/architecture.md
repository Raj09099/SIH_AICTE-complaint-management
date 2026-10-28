# SIH26264 Complaint Intelligence Architecture

## System Overview

The **SIH26264 Complaint Intelligence** system is designed to provide AICTE (All India Council for Technical Education) leadership and bureau officials with cross-departmental intelligence, tracking, and decision assistance for institution-related grievances.

```
+--------------------------------------------------------------------------------+
|                           React Single Page Application                        |
|   (Vite, Tailwind CSS, React Router, Recharts, Axios, Lucide Icons)            |
+---------------------------------------+----------------------------------------+
                                        | HTTP / JSON REST APIs
                                        v
+--------------------------------------------------------------------------------+
|                             FastAPI Backend Service                            |
|                                                                                |
|  +--------------------+  +---------------------+  +-------------------------+  |
|  |  Core & Security   |  |  API Route Layer    |  |  ML Intelligence Layer  |  |
|  |  - Config / Env    |  |  - Auth             |  |  - Overlap Detector     |  |
|  |  - JWT / Passwords |  |  - Complaints       |  |  - Pattern Detector     |  |
|  |  - Permissions     |  |  - Institutions     |  |  - Evidence Checker     |  |
|  |                    |  |  - Case Overlap     |  |  - Text Preprocessing   |  |
|  |                    |  |  - Problem Patterns |  |                         |  |
|  |                    |  |  - Evidence Checker |  |                         |  |
|  |                    |  |  - Analytics        |  |                         |  |
|  +--------------------+  +---------------------+  +-------------------------+  |
|                                                                                |
|  +--------------------+  +---------------------+  +-------------------------+  |
|  |  Services Layer    |  |  Repository Layer   |  |  SQLAlchemy ORM Models  |  |
|  +--------------------+  +---------------------+  +-------------------------+  |
+---------------------------------------+----------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
|                               PostgreSQL Database                              |
|  (Institutions, Complaints, Overlaps, Patterns, Evidence Documents, Audits)    |
+--------------------------------------------------------------------------------+
```

---

## Machine Learning & Intelligence Modules

### 1. Smart Case Relationship & Overlap Detection (`backend/app/ml/overlap_detector.py`)
- **Objective**: Detect duplicate complaints, multi-complainant submissions on identical incidents, or related issues filed across different AICTE cells (e.g. Anti-Ragging Cell vs Approval Bureau).
- **Techniques**:
  - Text normalization (tokenization, stopword removal, lemmatization).
  - TF-IDF vectorization and dense embeddings for semantic similarity.
  - Hybrid scoring combining textual similarity, institution code matching, category match, and incident timestamp proximity.
  - Generates confidence score and highlights key overlapping phrases.

### 2. Multi-Institution Problem Pattern Detector (`backend/app/ml/pattern_detector.py`)
- **Objective**: Uncover systemic, recurring issues spanning multiple colleges within a state, university affiliation, or pan-India.
- **Techniques**:
  - Unsupervised text clustering (e.g., HDBSCAN / K-Means on document representations).
  - Frequency anomaly detection across complaint categories (e.g., sudden spikes in fee-related complaints).
  - Trend aggregation by bureau, state, and institution category.

### 3. Resolution Evidence Checker (`backend/app/ml/evidence_checker.py`)
- **Objective**: Assist human reviewers in inspecting institutional response documents (PDF affidavits, compliance letters, payment proofs) against alleged complaints.
- **Techniques**:
  - PyMuPDF (`fitz`) high-fidelity text extraction from PDF files.
  - Extraction of key entities (dates, monetary amounts, reference numbers).
  - Relevance alignment calculation between resolution evidence text and complaint grievance terms.
  - Produces an automated audit checklist with relevance indicators for human sign-off.

---

## Data Model Highlights (`database/schema.sql`)

- **institutions**: Stores AICTE approved technical colleges, universities, location, and approval history.
- **users**: Authorized AICTE bureau officers with role-based access control (Admin, Bureau Head, Case Officer, Reviewer).
- **complaints**: Comprehensive grievance tracking (complainant type, category, bureau assignment, urgency, status, escalation).
- **case_overlaps**: Detected pairwise relationships between complaints, similarity score, and officer review state.
- **problem_patterns**: Grouped recurring issues affecting multiple institutions.
- **resolution_evidence**: Uploaded institutional compliance documents, extracted text, relevance scores, and reviewer remarks.
