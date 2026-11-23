# RosterIQ: Product Walkthrough & Demonstration Video Script

> **Assessment Submission:** Smart Roster Management System  
> **Duration:** 4 minutes 45 seconds (Target: 3 to 5 minutes)  
> **Target Audience:** Technical Evaluation Panel, Operations Managers & Pod Leads  
> **Presenter:** Full-Stack & Optimization Lead  

---

## Pre-Recording Setup Instructions

1. **Start Backend Server**:
   ```powershell
   cd d:\projects\backend
   py -3.14 -m uvicorn app.main:app --port 8000 --reload
   ```
2. **Start Frontend Dev Server**:
   ```powershell
   cd d:\projects\frontend
   npm run dev
   ```
3. **Open Browser**: Navigate to `http://localhost:5173` in fullscreen mode (1920x1080, dark mode).
4. **Ensure Database is Seeded**: 35 employees, 20 brands, 5 pods.

---

## Time-Coded Walkthrough Script

### [0:00 – 0:30] Introduction: The Workforce Optimization Challenge
- **On-Screen Action**:
  - Show the **RosterIQ Operational Dashboard** (`/`).
  - Cursor highlights key metric cards: *Total Employees (35)*, *Active Brands (20)*, *Operational Pods (5)*, *Monthly Coverage*.
- **Voiceover**:
  > *"Welcome to RosterIQ, an intelligent workforce planning and roster optimization system engineered specifically for multi-tenant outsourcing and omnichannel D2C brands.*  
  > *Managing hundreds of agents across dozens of brands is mathematically complex. Over 80% of client brands rely on dedicated single-resource models, while others operate 24/7 or close on Sundays and national holidays.*  
  > *RosterIQ replaces fragile manual spreadsheets and non-deterministic LLM guesses with deterministic constraint satisfaction programming using Google OR-Tools CP-SAT, ensuring 100% labor law compliance and zero coverage shortages."*

---

### [0:30 – 1:00] Workforce Management: Pods, Brands, Processes & Assignments
- **On-Screen Action**:
  1. Click on **Operational Pods** in the sidebar (`/pods`): Show 5 pods, pointing out the designated Pod Lead badge on *Pod Alpha* (Jonathan Vance) and *Pod Beta* (Priya Sharma).
  2. Click on **Client Brands** (`/brands`): Filter by "Single-Resource" to show dedicated accounts (e.g. *GlowSkin Organics*, *FreshRoast Coffee*), then show enterprise multi-resource accounts (*OmniTech Electronics*, *Aura Beauty*).
  3. Click on **Role Assignments** (`/assignments`): Show how agents have primary brand mappings and cross-trained backup qualifications.
- **Voiceover**:
  > *"RosterIQ structures operations into hierarchical Pods led by designated Pod Leads.*  
  > *Under Brands, we distinguish between single-resource dedicated accounts and enterprise accounts that require multi-agent shift coverage.*  
  > *Our Assignment Matrix maps each agent's qualifications, primary brand allocations, and cross-trained backup skills with strict validity date ranges."*

---

### [1:00 – 2:00] Deterministic Roster Generation with Google OR-Tools
- **On-Screen Action**:
  1. Click on **Roster Engine** in the sidebar (`/roster`).
  2. Select Month: **November**, Year: **2026**.
  3. Point out that the roster is in **DRAFT** state.
  4. Click the purple **"Generate Roster"** button.
  5. Show the loading spinner for ~1.5 seconds, then the fully hydrated 1–30 day matrix populates.
  6. Switch between views using the view selector:
     - **Company-Wide Matrix**: Show all 35 agents with shift pills (`W` for Working, `OFF` for Weekly-off, `L` for Leave).
     - **Pod-Wise View**: Filter to *Pod Beta*.
     - **Brand-Wise View**: Filter to *OmniTech Electronics*.
- **Voiceover**:
  > *"Let's generate the monthly schedule for November 2026. With one click, our backend formulates over 36,000 decision variables and passes them to Google OR-Tools CP-SAT.*  
  > *In under 1.5 seconds, the solver optimizes shift allocations, enforcing hard constraints: maximum 40 hours per week, at least 2 weekly offs per 7-day rolling window, maximum 6 consecutive working days, and zero overlapping shifts.*  
  > *Notice our multi-perspective matrix: managers can instantly slice the month by Company-wide, Pod-wise, Brand-wise, or Employee-wise perspectives."*

---

### [2:00 – 2:45] Brand Operating Calendars & Headcount Coverage
- **On-Screen Action**:
  1. Navigate to **Coverage Analysis** (`/coverage`).
  2. Select date **Sunday, November 8, 2026** (also a designated Diwali Public Holiday in seed data).
  3. Show how:
     - *FreshRoast Coffee* (`EXCEPT_SUNDAYS_AND_HOLIDAYS`) requires **0 staff**.
     - *UrbanChic Apparel* (`EXCEPT_PUBLIC_HOLIDAYS`) requires **0 staff** due to the holiday.
     - *OmniTech Electronics* (`EVERYDAY` 24/7) maintains required coverage.
- **Voiceover**:
  > *"Every brand process can enforce independent operating calendars.*  
  > *On Sunday, November 8th, which is also Diwali, RosterIQ's calendar engine dynamically computes staffing needs:*  
  > *FreshRoast is closed on Sundays and holidays—so requirement is zero.*  
  > *UrbanChic operates Sundays but closes on national holidays—so requirement is also zero.*  
  > *Meanwhile, 24/7 accounts like OmniTech maintain uninterrupted coverage without manual manager intervention."*

---

### [2:45 – 3:30] Single-Resource Absenteeism & Coverage Gap Detection
- **On-Screen Action**:
  1. Navigate to **Leaves & Availability** (`/leaves-holidays`).
  2. Show existing approved leave for **Rohan Mehta (EMP006)** on **November 10, 2026**.
  3. Highlight that EMP006 is the sole dedicated resource for *GlowSkin Organics*.
  4. Return to **Roster Engine** (`/roster`) and inspect Rohan Mehta's row on Day 10: Pill shows amber `L` (Leave), with 0 shifts assigned.
  5. Jump to **Coverage Analysis** (`/coverage`) on November 10: Show *GlowSkin Organics* flagged with **1 Shortage / Understaffed Gap**.
- **Voiceover**:
  > *"Now let's observe our highest-risk operational scenario: single-resource absenteeism.*  
  > *Rohan Mehta is the dedicated agent for GlowSkin Organics. He has an approved personal leave on November 10th.*  
  > *The CP-SAT solver strictly obeys the leave constraint—Rohan receives zero shifts. But because GlowSkin has no other primary agent assigned, RosterIQ immediately flags an operational coverage gap on Day 10."*

---

### [3:30 – 4:15] Audit Conflicts Center & Intelligent Replacement
- **On-Screen Action**:
  1. Click on **Conflicts Center** (`/conflicts`).
  2. Show the active conflict log:
     - `COVERAGE_DEFICIT`: GlowSkin Organics on Nov 10, 2026 (Severity: **CRITICAL**).
  3. Open the **Roster Matrix** on Day 10, click on GlowSkin's slot.
  4. Show replacement candidates from Pod Alpha with spare weekly capacity (e.g. *Sarah Jenkins*, EMP007).
  5. Manually assign Sarah Jenkins to cover GlowSkin on Day 10 and toggle **Lock Cell (`is_locked = True`)**.
  6. Click **"Regenerate Roster"**: The solver re-runs, keeping Sarah's locked assignment intact while balancing the rest of the month.
- **Voiceover**:
  > *"In the Conflicts Center, the deficit is flagged in real-time as a CRITICAL violation with root-cause transparency.*  
  > *The system recommends qualified pod members with available weekly capacity.*  
  > *A manager can assign Sarah Jenkins to cover the shift and lock the cell. When we regenerate, the solver treats this locked shift as an immutable constraint, rebalancing Sarah's remaining days to ensure she does not breach the 40-hour limit."*

---

### [4:15 – 4:45] Validation, Publishing, Versioning & CSV Export
- **On-Screen Action**:
  1. Click the green **"Validate Roster"** button: Toast notification confirms *"Roster validated successfully! 0 critical violations."*
  2. Click **"Publish Roster"**: Status pill changes to green **PUBLISHED**.
  3. Click **"Branch New Version"**: Demonstrates version incrementing to **v2 (DRAFT)** while preserving v1.
  4. Click **"Export CSV"**: Browser downloads `rosteriq_roster_2026_11.csv`.
  5. Briefly switch role via header dropdown to **"Employee"**: Show that "Publish Roster" and "Delete" buttons disappear or disable, demonstrating 3-tier RBAC.
- **Voiceover**:
  > *"Once all conflicts are resolved, the Operations Manager validates and publishes the roster.*  
  > *Published rosters are permanently locked and versioned. If revisions are needed, managers branch Version 2 while preserving historical audit compliance.*  
  > *Schedules can be exported in standardized CSV format for HR and workforce communications.*  
  > *With multi-role RBAC, sub-second optimization, and deterministic compliance, RosterIQ delivers intelligent workforce planning ready for production scale. Thank you!"*
