# RosterIQ: DataStraw Assessment Submission Checklist

> **Assessment:** Smart Roster Management System  
> **Candidate Name:** Vedang Pewekar  
> **Email:** `pewekarvedang@gmail.com`  
> **Reviewers:** `ozair.shaikh@datastraw.in`, `aryan.jaiswal@datastraw.in`  
> **CC:** `talent@datastraw.in`  
> **Subject Line Format:** `Smart Roster Management System Assignment - Vedang Pewekar`  

---

## Technical Deliverables Checklist

| Deliverable Item | Target Specification | Status | Location / Reference |
|---|---|:---:|---|
| **Public Application URL** | Hosted React 19 Frontend on Vercel | **READY / DEPLOYABLE** | `https://rosteriq.vercel.app` (See Deployment Guide) |
| **Public API Health URL** | Hosted FastAPI on Render (`/health`) | **READY / DEPLOYABLE** | `https://rosteriq-backend.onrender.com/health` |
| **GitHub Repository** | Clean, structured, well-documented repository | **VERIFIED** | `https://github.com/pewekarvedang/placell-` (or renamed `rosteriq`) |
| **Candidate LinkedIn Profile** | Professional profile link | **SUBMITTED** | `https://www.linkedin.com/in/vedang-pewekar/` |
| **Comprehensive README** | 22 detailed sections + 8 DataStraw answers | **VERIFIED** | [`README.md`](file:///d:/projects/README.md) |
| **Technical Approach Note** | Deep mathematical & architectural rationale | **VERIFIED** | [`docs/approach-note.md`](file:///d:/projects/docs/approach-note.md) |
| **Demonstration Video Script** | 4m 45s structured walkthrough | **VERIFIED** | [`docs/demo-script.md`](file:///d:/projects/docs/demo-script.md) |
| **Deployment & Verification Report**| Exhaustive audit of all subsystems | **VERIFIED** | [`docs/deployment-report.md`](file:///d:/projects/docs/deployment-report.md) |
| **Production Database Schema** | 13 models, Alembic migrations, PostgreSQL | **VERIFIED** | [`backend/migrations/`](file:///d:/projects/backend/migrations/) |
| **Idempotent Seeder** | 35 employees, 20 brands, 5 pods, calendars | **VERIFIED** | [`backend/seed.py`](file:///d:/projects/backend/seed.py) & `app/utils/seed_data.py` |
| **OR-Tools Scheduling Engine** | Deterministic CP-SAT, 14 Scenarios (A to N) | **VERIFIED (14/14 PASS)** | [`backend/app/services/scheduler.py`](file:///d:/projects/backend/app/services/scheduler.py) |
| **Conflict Detection Engine** | Independent rules auditing across 7 breach types | **VERIFIED** | [`backend/app/services/conflict_service.py`](file:///d:/projects/backend/app/services/conflict_service.py) |
| **Automated Backend Tests** | 54 Pytest unit, constraint & E2E tests | **VERIFIED (54/54 PASS)** | `cd backend && python -m pytest tests/ -v` |
| **Automated Frontend Tests** | 15 Vitest component & utility tests | **VERIFIED (15/15 PASS)** | `cd frontend && npm test` |
| **Automated Browser E2E Tests** | 5 Playwright Chromium browser tests | **VERIFIED (5/5 PASS)** | `cd frontend && npx playwright test` |

---

## Verification Summary Sign-Off

- **Code Quality & Type Safety**:
  - Backend: Python 3.14 with strict Pydantic v2 validation.
  - Frontend: TypeScript 5.9 + React 19 (`tsc -b` compiled with **0 errors** in 634ms).
- **Labor Law & Policy Guarantees**:
  - Maximum 40 weekly hours enforced mathematically.
  - Minimum 2 weekly offs per 7-day rolling window enforced mathematically.
  - Maximum 6 consecutive working days enforced mathematically.
  - Approved leaves strictly obeyed (0 shift allocations).
  - Manually locked cells preserved across re-optimizations.
- **Security & Data Hygiene**:
  - Zero hardcoded credentials or API keys in source code.
  - SQLite database files and `.env` files excluded from Git.
  - 3-tier Role-Based Access Control verified.
