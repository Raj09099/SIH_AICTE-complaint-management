# SIH26264 Complaint Intelligence

> **AICTE Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus & Cells**

---

## 1. Project Overview

**SIH26264 Complaint Intelligence** is an enterprise-grade complaint monitoring and decision-support platform designed for authorized officials of the **All India Council for Technical Education (AICTE)**. 

The platform enables centralized tracking of institution complaints across bureaus, automated detection of related/duplicate cases across cells, early identification of systemic problem patterns affecting multiple technical institutions, and relevance verification of resolution evidence documents uploaded by colleges.

### Key Capabilities (Target Features)
1. **Smart Case Relationship & Overlap Detection**: Uses natural language processing, category indexing, and institution metadata to identify duplicate complaints or related cross-bureau matters.
2. **Multi-Institution Problem Pattern Detector**: Clusters complaints across colleges to surface regional or national emerging issues (e.g., fee overcharging, faculty irregularities, infrastructure deficits).
3. **Resolution Evidence Checker**: Automatically parses resolution affidavits and compliance proofs (PDF/Docs) to assess contextual relevance against the original complaint, assisting human reviewers.
4. **Bureau Oversight & Timeline Management**: Provides unified role-based workflows, SLA deadlines, escalation trackers, and CSV/PDF exportable analytics.

---

## 2. Project Directory Structure

```text
sih26264-complaint-intelligence/
│
├── frontend/                     # React + Vite + Tailwind CSS Single Page Application
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── assets/               # Media and branding assets
│   │   ├── components/           # Modular UI components
│   │   │   ├── common/           # Shared reusable UI elements (Badges, Buttons, Cards)
│   │   │   ├── layout/           # App navigation, Sidebar, Navbar
│   │   │   ├── dashboard/        # Dashboard widgets and summary counters
│   │   │   └── complaints/       # Complaint cards, timelines, status badges
│   │   ├── pages/                # Route view components
│   │   │   ├── Login.jsx         # Officer authentication
│   │   │   ├── Dashboard.jsx     # Overview & bureau statistics
│   │   │   ├── Institutions.jsx  # AICTE approved institution directory
│   │   │   ├── Complaints.jsx    # Complaint search, filter & management
│   │   │   ├── ComplaintDetails.jsx # Case history & evidence review
│   │   │   ├── CaseOverlap.jsx   # Case relationship & duplicate analysis
│   │   │   ├── ProblemPatterns.jsx # Multi-institution issue clustering
│   │   │   ├── EvidenceChecker.jsx # PDF resolution evidence verification
│   │   │   ├── Analytics.jsx     # Cross-bureau trends & SLA reports
│   │   │   └── NotFound.jsx      # 404 Route fallback
│   │   ├── services/             # Axios API client modules
│   │   │   ├── api.js            # Base Axios instance & interceptors
│   │   │   ├── complaints.js     # Complaint API endpoints
│   │   │   ├── institutions.js   # Institution API endpoints
│   │   │   └── analytics.js      # Dashboard & reports API endpoints
│   │   ├── hooks/                # Custom React hooks
│   │   ├── context/              # Authentication & state context
│   │   ├── utils/                # Helper utilities & date formatters
│   │   ├── App.jsx               # Application router & main shell
│   │   ├── main.jsx              # DOM entry point
│   │   └── index.css             # Tailwind CSS & design tokens
│   ├── .env.example              # Frontend environment template
│   ├── package.json              # Frontend dependencies & scripts
│   ├── index.html                # HTML entry template
│   ├── postcss.config.js         # PostCSS configuration
│   ├── tailwind.config.js        # Tailwind CSS theme & configuration
│   └── vite.config.js            # Vite build configuration
│
├── backend/                      # FastAPI Python Application
│   ├── app/
│   │   ├── main.py               # FastAPI application initialization & routes
│   │   ├── core/
│   │   │   ├── config.py         # Application settings & environment parsing
│   │   │   └── security.py       # Authentication & password hashing utilities
│   │   ├── api/
│   │   │   └── routes/           # Modular endpoint routers
│   │   │       ├── auth.py       # Authentication & token endpoints
│   │   │       ├── complaints.py # Complaint lifecycle CRUD
│   │   │       ├── institutions.py # AICTE institution directory
│   │   │       ├── overlap.py    # Case relationship detection
│   │   │       ├── patterns.py   # Multi-institution pattern detector
│   │   │       ├── evidence.py   # Document evidence checker
│   │   │       └── analytics.py  # Trend reports & bureau metrics
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── repositories/         # Database access layer
│   │   ├── services/             # Application business logic
│   │   ├── ml/                   # Machine learning & NLP modules
│   │   │   ├── overlap_detector.py # Text & metadata duplicate matching
│   │   │   ├── pattern_detector.py # Clustering & pattern discovery
│   │   │   ├── evidence_checker.py # PDF text extraction & relevance evaluation
│   │   │   └── text_preprocessing.py # Text normalization & TF-IDF/embeddings
│   │   ├── utils/                # General helpers & logging
│   │   └── dependencies.py       # FastAPI dependency injection (DB session, auth)
│   ├── tests/                    # Backend automated tests
│   │   └── test_health.py        # Health endpoint verification
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   └── Dockerfile                # Backend containerization
│
├── database/
│   ├── migrations/               # Alembic database migrations
│   ├── seed/                     # Seed data scripts
│   └── schema.sql                # PostgreSQL DDL database schema
│
├── scripts/
│   ├── generate_synthetic_data.py # Synthetic complaint generator CLI
│   └── import_complaints.py      # Batch data ingestion CLI
│
├── docs/                         # Technical documentation & architecture
│   └── architecture.md           # System design & module documentation
├── .gitignore                    # Git exclusions
├── docker-compose.yml            # Local multi-container Docker configuration
└── README.md                     # Project documentation
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React.js 18 with JSX
- **Build Tool**: Vite
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **Navigation**: React Router v6
- **Data Fetching**: Axios
- **Data Visualization**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **ASGI Server**: Uvicorn
- **Database ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2 & Pydantic-Settings
- **Database**: PostgreSQL (with psycopg2-binary)
- **Data & ML**: Scikit-learn, Pandas, PyMuPDF (fitz)
- **Uploads & File Handling**: python-multipart
- **Security**: python-jose (JWT), Passlib (Bcrypt)

---

## 4. Prerequisites

Before starting local development, ensure you have:
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **Python**: v3.10, v3.11, or v3.12
- **PostgreSQL**: v14+ (optional for initial setup; can use Docker Compose)
- **Git**

---

## 5. Getting Started & Local Development

### Step 1: Clone and Prepare Environment Files

```bash
# Enter project directory
cd sih26264-complaint-intelligence

# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The FastAPI application will be accessible at:
- **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Interactive OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Step 3: Frontend Setup

Open a separate terminal:

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application will be running at [http://localhost:5173](http://localhost:5173).

### Step 4: (Optional) Docker Compose Setup

To start all services (PostgreSQL, Backend, Frontend) with a single command:

```bash
docker-compose up --build
```

---

## 6. Running Tests

To verify the backend health endpoint and basic structure:

```bash
cd backend
pytest tests/ -v
```

---

## 7. Recommended Next Implementation Steps

1. **Synthetic Data Generation**: Implement `scripts/generate_synthetic_data.py` to produce realistic synthetic complaints across AICTE bureaus.
2. **Database Migration & Models**: Finalize SQLAlchemy ORM models in `backend/app/models/` and execute initial migrations.
3. **Core ML Modules**:
   - Case Overlap TF-IDF / Cosine Similarity detector in `overlap_detector.py`.
   - Pattern clustering algorithm in `pattern_detector.py`.
   - PyMuPDF text parser and keyword relevance scoring in `evidence_checker.py`.
4. **Dashboard & UI Integration**: Connect React pages with backend endpoints using Axios services.
