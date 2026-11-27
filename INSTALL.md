# RosterIQ Installation & Evaluation Guide

> **Target Audience:** Technical Evaluation Team, DataStraw Assessment Reviewers  
> **Primary Reviewers:** `ozair.shaikh@datastraw.in`, `aryan.jaiswal@datastraw.in`  
> **Candidate:** Vedang Pewekar  

---

## ⚡ Zero-Config Evaluation (No Node.js Required)

RosterIQ comes with the production React 19 frontend **pre-compiled and embedded directly into the FastAPI application server**. 

An evaluator **does not need Node.js, npm, or Docker** to evaluate RosterIQ. All that is required is standard Python 3.10+.

---

## 1. Quick Launch on Windows (1-Click)

1. Extract the downloaded `datastraw.zip` or open the `datastraw` folder.
2. Double-click **`RosterIQ.bat`**.
3. **What happens automatically:**
   - Detects your Python environment.
   - Installs missing dependencies (`pip install -r requirements.txt`) if running for the first time.
   - Initializes the SQLite/PostgreSQL database and seeds it with **35 employees, 20 brands (80% single-resource), 5 pods, and 5 business processes** (`python seed.py`).
   - Starts the server on `http://127.0.0.1:8000`.
   - Opens the application in a **native Desktop App Window** using Edge or Chrome without browser toolbars.

*Optional Desktop Shortcut:* Double-click `create-desktop-shortcut.ps1` to place an icon on your Windows Desktop.

---

## 2. Quick Launch on macOS & Linux

1. Open your terminal in the extracted `datastraw` directory.
2. Run the shell script:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
3. The script sets up a virtual environment, installs dependencies, seeds the database, launches the server, and opens your default browser at `http://127.0.0.1:8000`.

---

## 3. Manual Step-by-Step Installation (Any Platform)

If you prefer to run manual terminal commands:

### Step 1: Create Virtual Environment (Optional but Recommended)
```bash
python -m venv venv

# On Windows:
.\venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### Step 2: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Seed Database
```bash
cd backend
python seed.py
```

### Step 4: Start the Full-Stack Application
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Step 5: Open Application
Navigate to:
- **Application Dashboard:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **API Health Check:** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 4. Running the Automated Test Suite (74 Tests)

All 74 test cases (backend unit, constraint scenarios A–N, 18-step E2E business workflow, frontend unit tests, and Playwright browser tests) can be verified:

```bash
# Run all 54 Backend Unit, Constraint, and Integration Tests
cd backend
python -m pytest tests/ -v
```

---

## 5. Technical Documentation Links
- [`README.md`](README.md): Comprehensive 22-section project documentation and answers to the eight assessment questions.
- [`docs/approach-note.md`](docs/approach-note.md): Operations research formulation and constraint models.
- [`docs/demo-script.md`](docs/demo-script.md): 4m 45s demonstration video script.
- [`docs/deployment-report.md`](docs/deployment-report.md): Formal audit and verification report.
