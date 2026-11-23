from datetime import date


def test_api_create_and_get_pod(client):
    """TASK 4 & TASK 6: Tests creating a Pod and retrieving it."""
    payload = {
        "name": "Pod Epsilon",
        "code": "POD-EPSILON",
        "description": "Fast Growth Support Pod"
    }
    response = client.post("/api/v1/pods", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Pod Epsilon"
    assert data["code"] == "POD-EPSILON"
    pod_id = data["id"]

    # Get by ID
    get_res = client.get(f"/api/v1/pods/{pod_id}")
    assert get_res.status_code == 200
    assert get_res.json()["code"] == "POD-EPSILON"


def test_api_create_and_get_employee(client):
    """TASK 4 & TASK 6: Tests creating an employee with workload limits and assigning to pod."""
    # 1. Create Pod first
    pod_res = client.post("/api/v1/pods", json={"name": "Pod Zeta", "code": "POD-ZETA"})
    assert pod_res.status_code == 201
    pod_id = pod_res.json()["id"]

    # 2. Create Employee belonging to Pod Zeta
    emp_payload = {
        "employee_code": "EMP-TEST-99",
        "full_name": "Marcus Aurelius",
        "email": "marcus.aurelius@datastraw.io",
        "phone": "+91-9876543210",
        "pod_id": pod_id,
        "max_weekly_hours": 40.0,
        "max_daily_hours": 8.0,
        "max_consecutive_days": 6,
        "default_weekly_off_days": "6"
    }
    emp_res = client.post("/api/v1/employees", json=emp_payload)
    assert emp_res.status_code == 201
    emp_data = emp_res.json()
    assert emp_data["employee_code"] == "EMP-TEST-99"
    assert emp_data["pod_name"] == "Pod Zeta"
    assert emp_data["max_weekly_hours"] == 40.0

    # 3. Check duplicate employee code validation
    dup_res = client.post("/api/v1/employees", json=emp_payload)
    assert dup_res.status_code == 400


def test_api_create_brand_and_process(client):
    """TASK 4 & TASK 6: Tests creating Brands and Processes."""
    # Create Brand
    brand_res = client.post("/api/v1/brands", json={
        "name": "SuperBrand D2C",
        "code": "SUPERBRAND",
        "client_name": "Super Innovations Ltd."
    })
    assert brand_res.status_code == 201
    brand_data = brand_res.json()
    assert brand_data["name"] == "SuperBrand D2C"
    brand_id = brand_data["id"]

    # Create Process
    proc_res = client.post("/api/v1/processes", json={
        "name": "Abandoned Cart Test",
        "code": "ACC-API-TEST",
        "description": "WhatsApp Recovery"
    })
    assert proc_res.status_code == 201
    proc_id = proc_res.json()["id"]

    # Associate Brand and Process with Operating Calendar
    bp_res = client.post("/api/v1/brand-processes", json={
        "brand_id": brand_id,
        "process_id": proc_id,
        "operating_calendar": "EXCEPT_SUNDAYS_AND_HOLIDAYS",
        "min_headcount_per_shift": 1
    })
    assert bp_res.status_code == 201
    bp_data = bp_res.json()
    assert bp_data["operating_calendar"] == "EXCEPT_SUNDAYS_AND_HOLIDAYS"
    assert bp_data["min_headcount_per_shift"] == 1


def test_api_assign_employee_to_brand_and_process(client):
    """TASK 4 & TASK 6: Tests assigning an employee to a brand and process with date range."""
    # 1. Setup employee, brand, process
    emp = client.post("/api/v1/employees", json={
        "employee_code": "ASSIGN-EMP-1",
        "full_name": "Assignee One",
        "email": "assignee1@datastraw.io"
    }).json()

    brand = client.post("/api/v1/brands", json={"name": "Assign Brand", "code": "ASSIGN-B"}).json()
    proc = client.post("/api/v1/processes", json={"name": "Assign Proc", "code": "ASSIGN-P"}).json()

    # 2. Create Assignment with start date and end date
    assign_payload = {
        "employee_id": emp["id"],
        "brand_id": brand["id"],
        "process_id": proc["id"],
        "start_date": "2026-11-01",
        "end_date": "2026-12-31",
        "is_primary": True,
        "allocation_percentage": 100.0
    }
    assign_res = client.post("/api/v1/employee-assignments", json=assign_payload)
    assert assign_res.status_code == 201
    assign_data = assign_res.json()
    assert assign_data["employee_name"] == "Assignee One"
    assert assign_data["brand_name"] == "Assign Brand"
    assert assign_data["start_date"] == "2026-11-01"
    assert assign_data["end_date"] == "2026-12-31"

    # 3. Test invalid date range validation (end_date < start_date)
    invalid_payload = {
        "employee_id": emp["id"],
        "brand_id": brand["id"],
        "process_id": proc["id"],
        "start_date": "2026-12-31",
        "end_date": "2026-01-01"
    }
    invalid_res = client.post("/api/v1/employee-assignments", json=invalid_payload)
    assert invalid_res.status_code == 400


def test_api_update_employee_availability(client):
    """TASK 4 & TASK 6: Tests configuring and updating employee availability (leave/comp-off)."""
    emp = client.post("/api/v1/employees", json={
        "employee_code": "AVAIL-EMP-2",
        "full_name": "Leave Taker",
        "email": "leavetaker@datastraw.io"
    }).json()

    avail_payload = {
        "employee_id": emp["id"],
        "date": "2026-11-20",
        "availability_type": "LEAVE",
        "leave_type": "PLANNED_LEAVE",
        "status": "APPROVED",
        "reason": "Personal medical leave"
    }
    avail_res = client.post("/api/v1/employee-availability", json=avail_payload)
    assert avail_res.status_code == 201
    avail_data = avail_res.json()
    assert avail_data["availability_type"] == "LEAVE"
    assert avail_data["reason"] == "Personal medical leave"

    # Update availability to COMP_OFF
    record_id = avail_data["id"]
    update_res = client.put(f"/api/v1/employee-availability/{record_id}", json={
        "availability_type": "COMP_OFF",
        "reason": "Changed to compensatory off"
    })
    assert update_res.status_code == 200
    assert update_res.json()["availability_type"] == "COMP_OFF"
    assert update_res.json()["reason"] == "Changed to compensatory off"


def test_api_public_holidays_and_shifts(client):
    """TASK 4: Tests Public Holiday and Shift CRUD endpoints."""
    # 1. Public Holiday
    hol_res = client.post("/api/v1/public-holidays", json={
        "name": "Special Festival",
        "date": "2026-10-20",
        "description": "Regional Festival"
    })
    assert hol_res.status_code == 201
    hol_id = hol_res.json()["id"]

    get_hol = client.get(f"/api/v1/public-holidays/{hol_id}")
    assert get_hol.status_code == 200
    assert get_hol.json()["name"] == "Special Festival"

    # 2. Shift
    shift_res = client.post("/api/v1/shifts", json={
        "name": "Evening Special Shift",
        "code": "EVE-SPECIAL",
        "start_time": "15:00:00",
        "end_time": "23:00:00",
        "duration_hours": 8.0,
        "is_overnight": False
    })
    assert shift_res.status_code == 201
    shift_data = shift_res.json()
    assert shift_data["code"] == "EVE-SPECIAL"
    assert shift_data["duration_hours"] == 8.0
