# RosterIQ - Smart Roster Management System (Backend Foundation)

> **DataStraw Tech Internship Assessment Submission**  
> Engineered by a Senior Python Backend Engineer using **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic V2**, and **Alembic**.

---

## 1. Executive Summary & Architecture

RosterIQ is an enterprise scheduling and roster management platform designed for omnichannel D2C operational support teams. In complex operational settings where 80% of brands are managed by dedicated single resources and 20% by cross-functional pods sharing processes, manual scheduling in spreadsheets leads to silent coverage failures, unmonitored overtime, and compliance violations.

RosterIQ solves this via a normalized relational database model, configurable client operating calendars, automated constraint validation, and audit-ready version control.

### Technology Stack
- **Framework**: FastAPI (High performance, async-capable, OpenAPI 3.1)
- **ORM**: SQLAlchemy 2.0 (Declarative mapping, strict relationships, composite indexes)
- **Data Validation & Settings**: Pydantic v2 & `pydantic-settings`
- **Database**: PostgreSQL (Production-grade relational engine; with zero-config local SQLite fallback)
- **Migrations**: Alembic (Automated schema migration tracking)
- **Test Suite**: Pytest & HTTPX (21 automated unit, integration, and API tests)

---

## 2. Project Directory Structure

```
backend/
├── app/
│   ├── config.py                  # Pydantic Settings & environment variables
│   ├── database.py                # SQLAlchemy 2.0 engine, SessionLocal, get_db dependency
│   ├── main.py                    # FastAPI application, lifecycle, exception handlers
│   ├── models/                    # 13 SQLAlchemy models
│   │   ├── brand.py               # Brands (D2C clients)
│   │   ├── brand_process.py       # Brand-Process associations & Operating Calendar Rules
│   │   ├── employee.py            # Employees & configurable workload limits
│   │   ├── employee_assignment.py # Brand/Process resource assignments (with date ranges)
│   │   ├── employee_availability.py# Leaves, comp-offs, and unavailability
│   │   ├── pod.py                 # Operational pods with designated pod leads
│   │   ├── process.py             # CS, ACC, Retention, NDR, VIP_CX
│   │   ├── public_holiday.py      # Declared public holidays
│   │   ├── roster.py              # Rosters (DRAFT, VALIDATED, PUBLISHED, version history)
│   │   ├── roster_assignment.py   # Shift assignments with manual locking support
│   │   ├── roster_assignment_process.py # Multi-process allocation per shift
│   │   ├── scheduling_conflict.py # Coverage gaps, workload limits, leave collisions
│   │   └── shift.py               # Morning, General, Evening, Night shift definitions
│   ├── schemas/                   # Pydantic V2 request/response validation schemas
│   ├── routes/                    # Modular API router endpoints
│   ├── services/                  # Business logic & domain services
│   └── utils/
│       ├── calendar_utils.py      # Operating calendar evaluation engine
│       └── seed_data.py           # Realistic sample data (32 employees, 10 brands, 4 pods)
├── migrations/                    # Alembic migration environment and versions
│   ├── env.py
│   └── versions/
├── tests/                         # Pytest test suite
│   ├── conftest.py                # In-memory test fixtures and client overrides
│   ├── test_models_validation.py  # Model constraints and conflict resolution tests
│   ├── test_relationships.py      # Foreign keys, cascades, circular pod lead tests
│   ├── test_operating_calendars.py# EVERYDAY, EXCEPT_HOLIDAYS, CUSTOM calendar tests
│   ├── test_api.py                # CRUD API endpoints test
│   └── test_roster_generation.py  # End-to-end generation, locking, versioning tests
├── .env.example                   # Environment configuration template
├── alembic.ini                    # Alembic configuration
└── requirements.txt               # Locked dependencies
```

---

## 3. Database Models & Schema Design (13 Core Models)

| # | Model | Table Name | Purpose & Key Constraints |
|---|---|---|---|
| 1 | **Employee** | `employees` | Employees with configurable workload limits (`max_weekly_hours`, `max_daily_hours`, `max_consecutive_days`, `default_weekly_off_days`). |
| 2 | **Pod** | `pods` | Operational pods. Foreign key to `employees.id` designates pod lead with `post_update=True`. |
| 3 | **Brand** | `brands` | D2C brand clients. Indexed `code` and `name`. |
| 4 | **Process** | `processes` | Operational capabilities (`CS`, `ACC`, `RETENTION`, `NDR`, `VIP_CX`). |
| 5 | **BrandProcess** | `brand_processes` | Links brand to process. Stores `operating_calendar` rule, `custom_operating_days`, and `min_headcount_per_shift`. Unique constraint on `(brand_id, process_id)`. |
| 6 | **EmployeeAssignment** | `employee_assignments` | Maps employee to brand/process. Supports `start_date` and `end_date`, `allocation_percentage`, and primary flag. Null `process_id` denotes dedicated brand ownership. |
| 7 | **EmployeeAvailability** | `employee_availabilities` | Tracks `LEAVE`, `COMP_OFF`, `UNAVAILABLE`, and `WEEKLY_OFF`. Unique on `(employee_id, date)`. |
| 8 | **PublicHoliday** | `public_holidays` | Declared gazetted holidays. Unique indexed `date`. |
| 9 | **Shift** | `shifts` | Shift definitions (`MORNING`, `GENERAL`, `EVENING`, `NIGHT`), start/end times, and duration hours. |
| 10 | **Roster** | `rosters` | Monthly rosters. States: `DRAFT`, `VALIDATED`, `PUBLISHED`, `ARCHIVED`. Version tracking with `parent_roster_id`. Unique on `(month, year, version)`. |
| 11 | **RosterAssignment** | `roster_assignments` | Daily assignment. Supports `is_locked` for human edits and `is_manual_override`. Unique on `(roster_id, employee_id, date)`. |
| 12 | **RosterAssignmentProcess** | `roster_assignment_processes` | Allows single shift to split hours across multiple processes (e.g. 4h ACC + 4h CS) within employee capacity. |
| 13 | **SchedulingConflict** | `scheduling_conflicts` | Flags `COVERAGE_GAP`, `LEAVE_CONFLICT`, `WORKLOAD_LIMIT_EXCEEDED`, and `CONSECUTIVE_DAYS_EXCEEDED` with `CRITICAL`, `WARNING`, and `INFO` severity. |

---

## 4. Operating Calendar Rules (Task 3)

The system supports four client operating rules configured per `BrandProcess`:

1. **`EVERYDAY`**: 365-day operation. Required every single day, including Sundays and public holidays (e.g., OmniTech CS, GlowSkin CS).
2. **`EXCEPT_PUBLIC_HOLIDAYS`**: Operates every day (including Sundays) except declared public holidays (e.g., UrbanChic CS, FitPro CS).
3. **`EXCEPT_SUNDAYS_AND_HOLIDAYS`**: Operates Monday through Saturday; closed on Sundays and public holidays (e.g., FreshRoast NDR, PureSnacks CS).
4. **`CUSTOM`**: Configurable days of the week (e.g., Mon–Fri `0,1,2,3,4` for LunaSleep or Tue–Sat `1,2,3,4,5` for EcoClean) and closed on public holidays.

The utility `app.utils.calendar_utils.is_brand_process_operating_on_date()` encapsulates this logic deterministically.

---

## 5. Answers to Assessment Evaluation Questions (Section 8)

### 1. How did you model employees, brands, processes, pods, and their relationships?
- **Employees & Pods**: Employees belong to operational pods (`Employee.pod_id -> Pod.id`). Pods designate a pod lead (`Pod.lead_id -> Employee.id`). To prevent circular dependency locks during table creation and updates, SQLAlchemy's `post_update=True` is utilized.
- **Brands & Processes**: Brands and processes have a many-to-many relationship mediated by `BrandProcess`. Each `BrandProcess` carries client-specific requirements: operating calendar rules, custom active weekdays, and minimum staffing headcounts.
- **Resource Allocations**: Handled by `EmployeeAssignment`. When an employee manages an entire brand (80% pattern), `process_id` is set to `NULL`. When assigned to a specialized process, `process_id` is explicitly set. Assignments have explicit `start_date` and `end_date` bounds.
- **Shift & Multi-Process Execution**: Each daily roster entry (`RosterAssignment`) can link to one or more `RosterAssignmentProcess` records. This allows one employee to work across multiple processes or brands within a single 8-hour shift.

### 2. How does your system generate a roster and determine whether it satisfies required constraints?
- Roster generation runs through `RosterService.generate_monthly_roster()`:
  1. Identifies all calendar days in the target month.
  2. Queries public holidays and active brand processes with their operating rules.
  3. Checks employee leaves and comp-offs.
  4. Preserves any existing assignments flagged with `is_locked=True`.
  5. Schedules primary and cross-trained employees for operating processes.
  6. Automatically executes `ConflictService.detect_conflicts()`:
     - **Critical constraint check**: Flags coverage gaps if an operating brand process has 0 assigned employees or is below `min_headcount_per_shift`.
     - **Leave collision check**: Flags critical errors if an employee is assigned while having approved leave.
     - **Workload check**: Flags warnings if daily hours exceed `max_daily_hours` or weekly hours exceed `max_weekly_hours`.
     - **Consecutive days check**: Flags warnings if consecutive working days exceed `max_consecutive_days`.
  7. Only rosters with zero critical conflicts can be transitioned to `VALIDATED` and subsequently `PUBLISHED`.

### 3. How did you handle the difference between single-resource brands and brands with multiple employees?
- **Single-Resource Brands (80%)**: Assigned via `EmployeeAssignment` with `process_id = NULL` and `is_primary = True`. In the scheduling engine, this employee is prioritized as the primary owner for all processes under that brand on required operating days.
- **Multi-Resource Brands (20%)**: Assigned via `EmployeeAssignment` with specific `process_id` values and `allocation_percentage`. Where multiple employees share a process (e.g. Aura Beauty CS requiring 2 headcount), both employees are scheduled, or shifts are distributed.

### 4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?
- If the single-resource employee is on approved leave (`EmployeeAvailability`), the scheduling engine respects their leave and marks their daily assignment as `is_off=True, off_reason='LEAVE'`.
- The engine's conflict detector immediately flags a `CRITICAL` `COVERAGE_GAP` conflict for that brand and date.
- The conflict record contains an explicit `resolution_suggestion` (e.g., assigning a qualified peer from the same pod or cross-trained backup).
- The roster status remains in `DRAFT` and **cannot be published** until an operations manager reviews the suggestion, assigns a backup, or adjusts the client coverage.

### 5. How does your system handle conflicting requirements or insufficient staffing?
- The system distinguishes between **Mandatory Constraints** (CRITICAL) and **Preferences** (WARNING / INFO):
  - Mandatory client coverage takes strict precedence over preferred weekly-off days. If a brand operates 365 days, the single resource is scheduled even on their default off day, but an informational warning is logged.
  - If no employee is available, rather than silently failing or assigning an invalid schedule, a `SchedulingConflict` is created in the database.
  - The validation endpoint (`POST /api/v1/rosters/{id}/validate`) returns `is_valid: false` along with the exact breakdown of critical, warning, and informational conflicts.

### 6. Which parts of the process did you automate, and which did you leave under human control? Why?
- **Automated**:
  - Daily operating calendar evaluation against public holidays and weekdays.
  - Initial baseline schedule generation across all 30+ team members.
  - Multi-process capacity hour division.
  - Exhaustive constraint and conflict detection.
- **Human Controlled**:
  - Leave approval workflow (`status = APPROVED`).
  - Manual overrides and assignment locking (`is_locked = True`).
  - Emergency cross-pod reassignments when a dedicated brand lead is sick.
  - Roster publishing (`POST /publish`), ensuring managerial accountability before schedules are released to employees.

### 7. If the company doubled its team and brand count, what would you change about your solution?
- **Linear Programming / CP-SAT Solver**: Integrate OR-Tools (Google CP-SAT) for optimal constraint satisfaction across hundreds of variables rather than greedy heuristics.
- **Background Job Queue**: Offload monthly schedule generation to Celery or ARQ with Redis for asynchronous job execution.
- **PostgreSQL Read Replicas & Partitioning**: Partition `roster_assignments` by `(year, month)` to maintain high indexing speed as assignment tables grow into millions of rows.

### 8. If you had one additional week to work on this, what would you improve first?
- **Automated Backup Recommendation Engine**: Suggest the optimal replacement employee based on pod proximity, current workload capacity, and skill overlap.
- **Real-Time WebSocket Notifications**: Push immediate conflict alerts to operations managers when an employee requests emergency leave on a published roster.
- **Exporting Integrations**: Add one-click export to Google Sheets and Excel (`.xlsx`).

---

## 6. Setup & Execution Instructions

### Prerequisites
- Python 3.11+ (Python 3.14 / 3.13 tested)
- PostgreSQL (or local SQLite)

### Installation
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
To use PostgreSQL, set your connection URL in `.env`:
```ini
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/rosteriq
```
*(If no PostgreSQL instance is configured, RosterIQ will default to `sqlite:///./rosteriq.db` without crashing).*

### Database Migrations
Apply Alembic migrations:
```bash
alembic upgrade head
```

### Running Tests
Execute the comprehensive Pytest suite:
```bash
pytest tests -v
```

### Starting the FastAPI Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`
- Health Endpoint: `http://localhost:8000/health`
