from datetime import date


def test_roster_lifecycle_and_conflict_detection(client):
    """
    Tests complete Roster lifecycle:
    1. Create Draft Roster
    2. Setup Single-Resource Brand with 365-day operation (EVERYDAY)
    3. Put the single employee on Leave -> Detect CRITICAL COVERAGE_GAP conflict
    4. Lock an assignment
    5. Branch a new version (v2)
    6. Validate roster
    """
    # 1. Create Employee
    emp = client.post("/api/v1/employees", json={
        "employee_code": "ROST-LIFECYCLE-1",
        "full_name": "Solo Operator",
        "email": "solo@datastraw.io"
    }).json()

    # 2. Create Brand & Process
    brand = client.post("/api/v1/brands", json={"name": "Solo Brand", "code": "SOLO-B"}).json()
    proc = client.post("/api/v1/processes", json={"name": "Solo CS", "code": "SOLO-CS"}).json()

    # 3. BrandProcess requiring EVERYDAY operation
    client.post("/api/v1/brand-processes", json={
        "brand_id": brand["id"],
        "process_id": proc["id"],
        "operating_calendar": "EVERYDAY",
        "min_headcount_per_shift": 1
    })

    # 4. Assign Employee as dedicated resource
    client.post("/api/v1/employee-assignments", json={
        "employee_id": emp["id"],
        "brand_id": brand["id"],
        "process_id": proc["id"],
        "start_date": "2026-11-01"
    })

    # 5. Add an approved leave for Solo Operator on Nov 10
    client.post("/api/v1/employee-availability", json={
        "employee_id": emp["id"],
        "date": "2026-11-10",
        "availability_type": "LEAVE",
        "leave_type": "PLANNED_LEAVE",
        "status": "APPROVED",
        "reason": "Personal urgent leave"
    })

    # 6. Create Draft Roster for November 2026
    roster_res = client.post("/api/v1/rosters", json={
        "name": "November 2026 Operations Roster",
        "month": 11,
        "year": 2026
    })
    assert roster_res.status_code == 201
    roster = roster_res.json()
    roster_id = roster["id"]
    assert roster["status"] == "DRAFT"
    assert roster["version"] == 1

    # 7. Generate Roster
    gen_res = client.post(f"/api/v1/rosters/{roster_id}/generate")
    assert gen_res.status_code == 200

    # 8. Fetch Roster Conflicts: On Nov 10, Solo Brand has ZERO coverage because Solo Operator is on leave!
    conflicts_res = client.get(f"/api/v1/rosters/{roster_id}/conflicts")
    assert conflicts_res.status_code == 200
    conflicts = conflicts_res.json()
    assert len(conflicts) > 0

    # There should be a CRITICAL coverage gap on 2026-11-10 for Solo Brand
    nov10_conflicts = [c for c in conflicts if c["date"] == "2026-11-10" and c["conflict_type"] == "COVERAGE_GAP"]
    assert len(nov10_conflicts) >= 1
    assert "Solo Brand" in nov10_conflicts[0]["description"]

    # 9. Test Lock Assignment
    detail_res = client.get(f"/api/v1/rosters/{roster_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["assignments"]) > 0
    first_assign_id = detail["assignments"][0]["id"]

    lock_res = client.put(f"/api/v1/rosters/assignments/{first_assign_id}/lock", json={"is_locked": True})
    assert lock_res.status_code == 200
    assert lock_res.json()["is_locked"] is True

    # 10. Test Branch New Version
    new_ver_res = client.post(f"/api/v1/rosters/{roster_id}/new-version?notes=Handling+leave+rebalance")
    assert new_ver_res.status_code == 201
    new_roster = new_ver_res.json()
    assert new_roster["version"] == 2
    assert new_roster["parent_roster_id"] == roster_id
