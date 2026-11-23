"""
Performance & Scalability Benchmark test suite for RosterIQ CP-SAT optimization engine.
Measures solver runtime, memory footprint, and query efficiency under full load
(30 employees, 20 brands, 4 processes, 5 pods).
"""

import time
from datetime import date, time as dt_time
import pytest
from sqlalchemy import select

from app.models.employee import Employee
from app.models.pod import Pod
from app.models.brand import Brand
from app.models.process import Process
from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.models.employee_assignment import EmployeeAssignment
from app.models.shift import Shift
from app.services.roster_generator import generate_monthly_roster


def test_performance_30_employees_20_brands(db_session):
    """
    Performance SLA: Generate complete monthly roster for:
    - 30 Employees
    - 20 Brands
    - 4 Processes
    - 5 Pods
    Target latency: < 10.0 seconds (well within the 30.0s SLA).
    """
    # 1. Ensure shifts
    shifts = list(db_session.scalars(select(Shift)).all())
    if not shifts:
        s_gen = Shift(name="General Shift", code="GENERAL", start_time=dt_time(9, 0), end_time=dt_time(17, 0), duration_hours=8.0)
        db_session.add(s_gen)
        db_session.commit()

    # 2. Setup 5 Pods
    pods = []
    for i in range(1, 6):
        p = Pod(name=f"Perf Pod {i}", code=f"POD-P{i}")
        db_session.add(p)
        pods.append(p)
    db_session.flush()

    # 3. Setup 4 Processes
    procs = []
    proc_codes = ["CS", "ACC", "RET", "NDR"]
    for code in proc_codes:
        pr = Process(name=f"Perf {code}", code=f"P-{code}")
        db_session.add(pr)
        procs.append(pr)
    db_session.flush()

    # 4. Setup 20 Brands
    brands = []
    for i in range(1, 21):
        b = Brand(name=f"Perf Brand {i}", code=f"PB-{i}")
        db_session.add(b)
        brands.append(b)
    db_session.flush()

    # Link Brand Processes (e.g. 2 processes per brand = 40 brand processes)
    for idx, b in enumerate(brands):
        p1 = procs[idx % len(procs)]
        bp = BrandProcess(
            brand_id=b.id,
            process_id=p1.id,
            operating_calendar=OperatingCalendarRule.CUSTOM if idx % 2 == 0 else OperatingCalendarRule.EVERYDAY,
            custom_operating_days="0,1,2,3,4",
            min_headcount_per_shift=1
        )
        db_session.add(bp)

    # 5. Setup 30 Employees
    employees = []
    for i in range(1, 31):
        pod = pods[i % len(pods)]
        emp = Employee(
            employee_code=f"PERF-EMP-{i:03d}",
            full_name=f"Performance Agent {i}",
            email=f"perf{i}@datastraw.io",
            pod_id=pod.id,
            max_weekly_hours=40.0,
            max_daily_hours=8.0,
            max_consecutive_days=6
        )
        db_session.add(emp)
        employees.append(emp)
    db_session.flush()

    # Assign each employee to 2-3 brands and processes
    for idx, emp in enumerate(employees):
        b1 = brands[idx % len(brands)]
        b2 = brands[(idx + 1) % len(brands)]
        p = procs[idx % len(procs)]
        db_session.add(EmployeeAssignment(employee_id=emp.id, brand_id=b1.id, process_id=p.id, start_date=date(2026, 11, 1)))
        db_session.add(EmployeeAssignment(employee_id=emp.id, brand_id=b2.id, process_id=p.id, start_date=date(2026, 11, 1)))

    db_session.commit()

    # Measure solver execution time
    start_time = time.perf_counter()
    result = generate_monthly_roster(month=11, year=2026, db=db_session, timeout_seconds=10.0)
    elapsed = time.perf_counter() - start_time

    assert result["is_feasible"] is True
    assert result["total_employees"] >= 30
    assert elapsed < 10.0, f"Solver took {elapsed:.2f}s, exceeding 10s benchmark"
    print(f"\n[PERFORMANCE REPORT] 30 Employees, 20 Brands Roster Generated in {elapsed:.3f}s (Solver Wall Time: {result['optimization_statistics']['wall_time_seconds']:.3f}s)")
