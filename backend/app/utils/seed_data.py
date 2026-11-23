from datetime import date, time, datetime
from typing import Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.pod import Pod
from app.models.employee import Employee
from app.models.brand import Brand
from app.models.process import Process
from app.models.brand_process import BrandProcess, OperatingCalendarRule
from app.models.employee_assignment import EmployeeAssignment
from app.models.employee_availability import EmployeeAvailability, AvailabilityType, ApprovalStatus
from app.models.public_holiday import PublicHoliday
from app.models.shift import Shift


def seed_database(db: Session) -> None:
    """
    Populates the database with realistic demonstration data satisfying all assessment requirements.
    Idempotent: Uses unique-key lookups before inserting, ensuring safe repeated execution.
    Target Counts:
      - 4 Shifts
      - 7 Public Holidays
      - 5 Operational Pods
      - 5 Operational Processes
      - 35 Distinct Employees (>= 30 required)
      - 20 Brands (~80% single-resource: 16 dedicated + 4 multi-resource enterprise)
      - Operating Calendars (EVERYDAY, EXCEPT_PUBLIC_HOLIDAYS, EXCEPT_SUNDAYS_AND_HOLIDAYS, CUSTOM)
      - Availability Records (Approved Leaves, Comp-offs, Pending Leaves)
    """

    # 1. Shifts
    shift_defs = [
        ("General Shift", "GENERAL", time(9, 0), time(17, 0), 8.0, False),
        ("Morning Shift", "MORNING", time(6, 0), time(14, 0), 8.0, False),
        ("Evening Shift", "EVENING", time(14, 0), time(22, 0), 8.0, False),
        ("Night Shift", "NIGHT", time(22, 0), time(6, 0), 8.0, True),
    ]
    for name, code, st, et, dur, is_ovn in shift_defs:
        if not db.scalar(select(Shift).where(Shift.code == code)):
            db.add(Shift(name=name, code=code, start_time=st, end_time=et, duration_hours=dur, is_overnight=is_ovn))
    db.commit()

    # 2. Public Holidays (2026 Calendar)
    holiday_defs = [
        ("New Year's Day", date(2026, 1, 1), "National holiday"),
        ("Republic Day", date(2026, 1, 26), "National holiday"),
        ("Labor Day / May Day", date(2026, 5, 1), "International Workers' Day"),
        ("Independence Day", date(2026, 8, 15), "National holiday"),
        ("Gandhi Jayanti", date(2026, 10, 2), "National holiday"),
        ("Diwali", date(2026, 11, 8), "Festival of Lights"),
        ("Christmas Day", date(2026, 12, 25), "Christmas Day"),
    ]
    for name, h_date, desc in holiday_defs:
        if not db.scalar(select(PublicHoliday).where(PublicHoliday.date == h_date)):
            db.add(PublicHoliday(name=name, date=h_date, description=desc))
    db.commit()

    # 3. Operational Pods (5 Pods required)
    pod_defs = [
        ("Pod Alpha - Direct Brands", "POD-ALPHA", "High-focus dedicated direct D2C accounts"),
        ("Pod Beta - Enterprise D2C", "POD-BETA", "Multi-resource enterprise brand accounts"),
        ("Pod Gamma - High Velocity", "POD-GAMMA", "Fast-growing conversion and support accounts"),
        ("Pod Delta - Retention & Conversions", "POD-DELTA", "Dedicated retention, NDR and cart recovery"),
        ("Pod Epsilon - Strategic Accounts", "POD-EPSILON", "Strategic client accounts & VIP escalations"),
    ]
    for name, code, desc in pod_defs:
        if not db.scalar(select(Pod).where(Pod.code == code)):
            db.add(Pod(name=name, code=code, description=desc))
    db.commit()

    pod_map = {p.code: p for p in db.scalars(select(Pod)).all()}

    # 4. Operational Processes (5 Processes, satisfying >=4 required)
    process_defs = [
        ("Customer Support", "CS", "Omnichannel live chat, tickets and phone support"),
        ("Abandoned Cart Conversions", "ACC", "High-intent cart recovery via WhatsApp & call"),
        ("Retention & Loyalty", "RETENTION", "Subscriber retention, proactive outreach and churn reduction"),
        ("Non-Delivery Report Management", "NDR", "Courier escalation, RTO reduction and address verification"),
        ("VIP Customer Experience", "VIP_CX", "White-glove priority support for high-LTV customers"),
    ]
    for name, code, desc in process_defs:
        if not db.scalar(select(Process).where(Process.code == code)):
            db.add(Process(name=name, code=code, description=desc))
    db.commit()

    proc_map = {p.code: p for p in db.scalars(select(Process)).all()}

    # 5. Employees (35 Distinct Employees across 5 Pods)
    emp_defs = [
        # Pod Leads (Designated 1 per Pod)
        ("EMP001", "Jonathan Vance", "jonathan.vance@datastraw.io", "POD-ALPHA"),
        ("EMP002", "Priya Sharma", "priya.sharma@datastraw.io", "POD-BETA"),
        ("EMP003", "David Chen", "david.chen@datastraw.io", "POD-GAMMA"),
        ("EMP004", "Ayesha Khan", "ayesha.khan@datastraw.io", "POD-DELTA"),
        ("EMP005", "Marcus Aurelius", "marcus.a@datastraw.io", "POD-EPSILON"),

        # Pod Alpha Members (POD-ALPHA)
        ("EMP006", "Rohan Mehta", "rohan.mehta@datastraw.io", "POD-ALPHA"),
        ("EMP007", "Sarah Jenkins", "sarah.jenkins@datastraw.io", "POD-ALPHA"),
        ("EMP008", "Kavita Rao", "kavita.rao@datastraw.io", "POD-ALPHA"),
        ("EMP009", "Marcus Taylor", "marcus.taylor@datastraw.io", "POD-ALPHA"),
        ("EMP010", "Ananya Deshmukh", "ananya.deshmukh@datastraw.io", "POD-ALPHA"),
        ("EMP011", "Liam O'Connor", "liam.oconnor@datastraw.io", "POD-ALPHA"),

        # Pod Beta Members (POD-BETA: Enterprise D2C)
        ("EMP012", "Vikram Malhotra", "vikram.malhotra@datastraw.io", "POD-BETA"),
        ("EMP013", "Elena Rostova", "elena.rostova@datastraw.io", "POD-BETA"),
        ("EMP014", "Aditya Nair", "aditya.nair@datastraw.io", "POD-BETA"),
        ("EMP015", "Chloe Bennett", "chloe.bennett@datastraw.io", "POD-BETA"),
        ("EMP016", "Siddharth Joshi", "siddharth.joshi@datastraw.io", "POD-BETA"),
        ("EMP017", "Fatima Al-Mansoor", "fatima.almansoor@datastraw.io", "POD-BETA"),
        ("EMP018", "Arjun Reddy", "arjun.reddy@datastraw.io", "POD-BETA"),

        # Pod Gamma Members (POD-GAMMA: High Velocity)
        ("EMP019", "Meera Sen", "meera.sen@datastraw.io", "POD-GAMMA"),
        ("EMP020", "Carlos Ramirez", "carlos.ramirez@datastraw.io", "POD-GAMMA"),
        ("EMP021", "Divya Kapoor", "divya.kapoor@datastraw.io", "POD-GAMMA"),
        ("EMP022", "Daniel Kim", "daniel.kim@datastraw.io", "POD-GAMMA"),
        ("EMP023", "Tanvi Bhatia", "tanvi.bhatia@datastraw.io", "POD-GAMMA"),
        ("EMP024", "Oliver Brooks", "oliver.brooks@datastraw.io", "POD-GAMMA"),

        # Pod Delta Members (POD-DELTA: Retention & Conversions)
        ("EMP025", "Zoya Farooqui", "zoya.farooqui@datastraw.io", "POD-DELTA"),
        ("EMP026", "Naveen Sundaram", "naveen.sundaram@datastraw.io", "POD-DELTA"),
        ("EMP027", "Rachel Green", "rachel.green@datastraw.io", "POD-DELTA"),
        ("EMP028", "Harsh Vardhan", "harsh.vardhan@datastraw.io", "POD-DELTA"),
        ("EMP029", "Simran Kaur", "simran.kaur@datastraw.io", "POD-DELTA"),
        ("EMP030", "Lucas Martinez", "lucas.martinez@datastraw.io", "POD-DELTA"),

        # Pod Epsilon Members (POD-EPSILON: Strategic Accounts)
        ("EMP031", "Swati Pillai", "swati.pillai@datastraw.io", "POD-EPSILON"),
        ("EMP032", "Ethan Wright", "ethan.wright@datastraw.io", "POD-EPSILON"),
        ("EMP033", "Nadia Petrova", "nadia.petrova@datastraw.io", "POD-EPSILON"),
        ("EMP034", "Rajeshwari Iyer", "rajeshwari.iyer@datastraw.io", "POD-EPSILON"),
        ("EMP035", "Samuel Jackson", "samuel.jackson@datastraw.io", "POD-EPSILON"),
    ]

    for code, name, email, pod_code in emp_defs:
        if not db.scalar(select(Employee).where(Employee.employee_code == code)):
            pod = pod_map.get(pod_code)
            db.add(Employee(
                employee_code=code,
                full_name=name,
                email=email,
                pod_id=pod.id if pod else None,
                max_weekly_hours=40.0,
                max_daily_hours=8.0,
                max_consecutive_days=6,
                default_weekly_off_days="6",  # Sunday default
                is_active=True
            ))
    db.commit()

    emp_map = {e.employee_code: e for e in db.scalars(select(Employee)).all()}

    # Designate Pod Leads
    lead_assignments = [
        ("POD-ALPHA", "EMP001"),
        ("POD-BETA", "EMP002"),
        ("POD-GAMMA", "EMP003"),
        ("POD-DELTA", "EMP004"),
        ("POD-EPSILON", "EMP005"),
    ]
    for pod_code, lead_code in lead_assignments:
        pod = pod_map.get(pod_code)
        lead = emp_map.get(lead_code)
        if pod and lead and pod.lead_id != lead.id:
            pod.lead_id = lead.id
    db.commit()

    # 6. Brands (20 Brands Total: 16 Single-Resource = 80%, 4 Multi-Resource Enterprise = 20%)
    brand_defs = [
        # --- 16 Single-Resource Brands (~80%) ---
        ("GlowSkin Organics", "GLOWSKIN", "GlowSkin Naturals LLC", "Clean skincare & beauty D2C"),
        ("UrbanChic Apparel", "URBANCHIC", "UrbanChic Global", "Fast-fashion streetwear"),
        ("FreshRoast Coffee", "FRESHROAST", "FreshRoast Artisanal", "Subscription specialty coffee"),
        ("Zenith Footwear", "ZENITH", "Zenith Sports Inc.", "Performance athletic footwear"),
        ("PureSnacks D2C", "PURESNACKS", "Pure Foods Co.", "Healthy gluten-free snacking"),
        ("FitPro Supplements", "FITPRO", "FitPro Labs", "Fitness nutrition & vitamins"),
        ("LunaSleep Mattresses", "LUNASLEEP", "Luna Comfort Ltd.", "Ergonomic memory-foam bedding"),
        ("EcoClean Living", "ECOCLEAN", "Eco Clean Earth", "Plant-based household care"),
        ("Terra Botanics", "TERRA_BOTANICS", "Terra Life Inc.", "Organic herbal wellness supplements"),
        ("Nordic Hydration", "NORDIC_HYDRATION", "Nordic Flasks LLC", "Insulated stainless-steel drinkware"),
        ("Velvet Roast Chocolates", "VELVET_ROAST", "Velvet Chocolates Ltd.", "Handcrafted artisan dark chocolate"),
        ("Kinetic Activewear", "KINETIC_GEAR", "Kinetic Athletics", "Seamless gymwear & athleisure"),
        ("NutriCrunch Granola", "NUTRI_CRUNCH", "NutriFoods Co.", "Low-glycemic organic breakfast cereals"),
        ("Pulse Audio Gear", "PULSE_AUDIO", "Pulse Tech Ltd.", "ANC wireless headphones and earbuds"),
        ("Cocoa Bliss Bakery", "COCOA_BLISS", "Cocoa Bliss Artisans", "Keto and diabetic bakery treats"),
        ("AeroStride Insoles", "AERO_STRIDE", "AeroStride Ortho", "Custom 3D-printed shoe insoles"),

        # --- 4 Multi-Resource Enterprise Brands (20%) ---
        ("OmniTech Electronics", "OMNITECH", "OmniTech Devices", "Smart wearables & audio devices (Multi-team)"),
        ("Aura Beauty Worldwide", "AURABEAUTY", "Aura Luxe Cosmetics", "Luxury omnichannel cosmetics (Multi-team)"),
        ("Titan Home Appliances", "TITAN_HOME", "Titan Home Corp", "Smart kitchen and air purification devices"),
        ("Stellar Cosmetics", "STELLAR_COSMETICS", "Stellar Beauty Group", "Global vegan cosmetics & skincare"),
    ]

    for name, code, client, desc in brand_defs:
        if not db.scalar(select(Brand).where(Brand.code == code)):
            db.add(Brand(name=name, code=code, client_name=client, description=desc, is_active=True))
    db.commit()

    brand_map = {b.code: b for b in db.scalars(select(Brand)).all()}

    # 7. Brand Processes & Operating Calendars
    # Define operating rules and staffing requirements for all 20 brands
    bp_defs = [
        # Single-Resource Brands:
        ("GLOWSKIN", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("GLOWSKIN", "ACC", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("URBANCHIC", "CS", OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS, None, 1, False),
        ("FRESHROAST", "CS", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("FRESHROAST", "NDR", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("ZENITH", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("PURESNACKS", "CS", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("FITPRO", "CS", OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS, None, 1, False),
        ("LUNASLEEP", "CS", OperatingCalendarRule.CUSTOM, "0,1,2,3,4", 1, False),  # Mon-Fri
        ("ECOCLEAN", "CS", OperatingCalendarRule.CUSTOM, "1,2,3,4,5", 1, False),   # Tue-Sat
        ("TERRA_BOTANICS", "CS", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("NORDIC_HYDRATION", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("VELVET_ROAST", "CS", OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS, None, 1, False),
        ("KINETIC_GEAR", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("NUTRI_CRUNCH", "CS", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("PULSE_AUDIO", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("COCOA_BLISS", "CS", OperatingCalendarRule.CUSTOM, "0,1,2,3,4", 1, False),
        ("AERO_STRIDE", "CS", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),

        # Multi-Resource Enterprise Brands:
        ("OMNITECH", "CS", OperatingCalendarRule.EVERYDAY, None, 1, True),
        ("OMNITECH", "ACC", OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS, None, 1, False),
        ("OMNITECH", "NDR", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),

        ("AURABEAUTY", "CS", OperatingCalendarRule.EVERYDAY, None, 2, False),  # Headcount 2
        ("AURABEAUTY", "RETENTION", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
        ("AURABEAUTY", "VIP_CX", OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS, None, 1, False),

        ("TITAN_HOME", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("TITAN_HOME", "NDR", OperatingCalendarRule.EXCEPT_PUBLIC_HOLIDAYS, None, 1, False),

        ("STELLAR_COSMETICS", "CS", OperatingCalendarRule.EVERYDAY, None, 1, False),
        ("STELLAR_COSMETICS", "RETENTION", OperatingCalendarRule.EXCEPT_SUNDAYS_AND_HOLIDAYS, None, 1, False),
    ]

    for b_code, p_code, rule, custom_days, min_headcount, req_24_7 in bp_defs:
        b = brand_map.get(b_code)
        p = proc_map.get(p_code)
        if b and p:
            existing = db.scalar(
                select(BrandProcess).where(
                    BrandProcess.brand_id == b.id,
                    BrandProcess.process_id == p.id
                )
            )
            if not existing:
                db.add(BrandProcess(
                    brand_id=b.id,
                    process_id=p.id,
                    operating_calendar=rule,
                    custom_operating_days=custom_days,
                    min_headcount_per_shift=min_headcount,
                    requires_24_7=req_24_7,
                ))
    db.commit()

    # 8. Employee Role Assignments (Single-Resource dedicated & Multi-Resource mappings)
    start_d = date(2026, 1, 1)

    # Dedicated single-resource mappings (16 single-resource brands assigned to dedicated primary agents)
    single_res_mappings = [
        ("EMP006", "GLOWSKIN"),
        ("EMP007", "URBANCHIC"),
        ("EMP008", "FRESHROAST"),
        ("EMP009", "ZENITH"),
        ("EMP010", "PURESNACKS"),
        ("EMP011", "FITPRO"),
        ("EMP019", "LUNASLEEP"),
        ("EMP020", "ECOCLEAN"),
        ("EMP021", "TERRA_BOTANICS"),
        ("EMP022", "NORDIC_HYDRATION"),
        ("EMP023", "VELVET_ROAST"),
        ("EMP024", "KINETIC_GEAR"),
        ("EMP025", "NUTRI_CRUNCH"),
        ("EMP026", "PULSE_AUDIO"),
        ("EMP027", "COCOA_BLISS"),
        ("EMP028", "AERO_STRIDE"),
    ]

    for emp_code, b_code in single_res_mappings:
        emp = emp_map.get(emp_code)
        b = brand_map.get(b_code)
        if emp and b:
            existing = db.scalar(
                select(EmployeeAssignment).where(
                    EmployeeAssignment.employee_id == emp.id,
                    EmployeeAssignment.brand_id == b.id,
                    EmployeeAssignment.process_id.is_(None)
                )
            )
            if not existing:
                db.add(EmployeeAssignment(
                    employee_id=emp.id,
                    brand_id=b.id,
                    process_id=None,  # Dedicated: handles all processes of this brand
                    start_date=start_d,
                    is_primary=True,
                    allocation_percentage=100.0,
                    is_active=True,
                    notes=f"Dedicated single-resource lead for {b.name}"
                ))

    # Multi-Resource Enterprise Assignments:
    # 1. OmniTech: EMP012 (CS), EMP013 (ACC), EMP014 (NDR), plus EMP013 backup CS
    b_omni = brand_map.get("OMNITECH")
    if b_omni:
        multi_omni = [
            ("EMP012", "CS", True, 100.0, "Primary CS Lead"),
            ("EMP013", "ACC", True, 100.0, "Primary ACC Conversion Specialist"),
            ("EMP014", "NDR", True, 100.0, "Primary Logistics Escalation Specialist"),
            ("EMP013", "CS", False, 50.0, "Cross-trained backup for CS"),
        ]
        for emp_code, p_code, is_pri, alloc, note in multi_omni:
            emp = emp_map.get(emp_code)
            p = proc_map.get(p_code)
            if emp and p:
                existing = db.scalar(
                    select(EmployeeAssignment).where(
                        EmployeeAssignment.employee_id == emp.id,
                        EmployeeAssignment.brand_id == b_omni.id,
                        EmployeeAssignment.process_id == p.id
                    )
                )
                if not existing:
                    db.add(EmployeeAssignment(
                        employee_id=emp.id,
                        brand_id=b_omni.id,
                        process_id=p.id,
                        start_date=start_d,
                        is_primary=is_pri,
                        allocation_percentage=alloc,
                        is_active=True,
                        notes=note
                    ))

    # 2. Aura Beauty Worldwide: EMP015 (CS), EMP016 (CS - 2nd slot), EMP017 (Retention), EMP018 (VIP_CX)
    b_aura = brand_map.get("AURABEAUTY")
    if b_aura:
        multi_aura = [
            ("EMP015", "CS", True, 100.0, "Primary Customer Support"),
            ("EMP016", "CS", True, 100.0, "Primary Support Tier 2"),
            ("EMP017", "RETENTION", True, 100.0, "Retention & Churn Specialist"),
            ("EMP018", "VIP_CX", True, 100.0, "VIP White-Glove Support"),
        ]
        for emp_code, p_code, is_pri, alloc, note in multi_aura:
            emp = emp_map.get(emp_code)
            p = proc_map.get(p_code)
            if emp and p:
                existing = db.scalar(
                    select(EmployeeAssignment).where(
                        EmployeeAssignment.employee_id == emp.id,
                        EmployeeAssignment.brand_id == b_aura.id,
                        EmployeeAssignment.process_id == p.id
                    )
                )
                if not existing:
                    db.add(EmployeeAssignment(
                        employee_id=emp.id,
                        brand_id=b_aura.id,
                        process_id=p.id,
                        start_date=start_d,
                        is_primary=is_pri,
                        allocation_percentage=alloc,
                        is_active=True,
                        notes=note
                    ))

    # 3. Titan Home Appliances: EMP029 (CS), EMP030 (NDR), EMP031 (Backup CS)
    b_titan = brand_map.get("TITAN_HOME")
    if b_titan:
        multi_titan = [
            ("EMP029", "CS", True, 100.0, "Primary Home Appliance Support"),
            ("EMP030", "NDR", True, 100.0, "Appliance Delivery Escalation"),
            ("EMP031", "CS", False, 50.0, "Backup Support Specialist"),
        ]
        for emp_code, p_code, is_pri, alloc, note in multi_titan:
            emp = emp_map.get(emp_code)
            p = proc_map.get(p_code)
            if emp and p:
                existing = db.scalar(
                    select(EmployeeAssignment).where(
                        EmployeeAssignment.employee_id == emp.id,
                        EmployeeAssignment.brand_id == b_titan.id,
                        EmployeeAssignment.process_id == p.id
                    )
                )
                if not existing:
                    db.add(EmployeeAssignment(
                        employee_id=emp.id,
                        brand_id=b_titan.id,
                        process_id=p.id,
                        start_date=start_d,
                        is_primary=is_pri,
                        allocation_percentage=alloc,
                        is_active=True,
                        notes=note
                    ))

    # 4. Stellar Cosmetics: EMP032 (CS), EMP033 (Retention), EMP034 (VIP_CX)
    b_stellar = brand_map.get("STELLAR_COSMETICS")
    if b_stellar:
        multi_stellar = [
            ("EMP032", "CS", True, 100.0, "Stellar Omnichannel Support"),
            ("EMP033", "RETENTION", True, 100.0, "Stellar VIP Subscriber Retention"),
            ("EMP034", "VIP_CX", True, 100.0, "Stellar Celebrity Account Manager"),
        ]
        for emp_code, p_code, is_pri, alloc, note in multi_stellar:
            emp = emp_map.get(emp_code)
            p = proc_map.get(p_code)
            if emp and p:
                existing = db.scalar(
                    select(EmployeeAssignment).where(
                        EmployeeAssignment.employee_id == emp.id,
                        EmployeeAssignment.brand_id == b_stellar.id,
                        EmployeeAssignment.process_id == p.id
                    )
                )
                if not existing:
                    db.add(EmployeeAssignment(
                        employee_id=emp.id,
                        brand_id=b_stellar.id,
                        process_id=p.id,
                        start_date=start_d,
                        is_primary=is_pri,
                        allocation_percentage=alloc,
                        is_active=True,
                        notes=note
                    ))
    db.commit()

    # 9. Employee Availability (Planned Leaves, Comp-offs & Unavailability)
    avail_defs = [
        # EMP006 (GlowSkin dedicated single-resource) on leave on Nov 10, 2026
        # Demonstrates single-resource coverage shortage!
        ("EMP006", date(2026, 11, 10), AvailabilityType.LEAVE, "PLANNED_LEAVE", ApprovalStatus.APPROVED, "Annual personal leave"),
        # EMP012 (OmniTech CS lead) on comp-off on Nov 12, 2026 (backup EMP013 covers seamlessly)
        ("EMP012", date(2026, 11, 12), AvailabilityType.COMP_OFF, "COMP_OFF", ApprovalStatus.APPROVED, "Weekend shift comp-off"),
        # EMP015 (Aura Beauty CS) unavailable on Nov 15, 2026
        ("EMP015", date(2026, 11, 15), AvailabilityType.UNAVAILABLE, None, ApprovalStatus.APPROVED, "Scheduled medical appointment"),
        # EMP022 (Nordic Hydration dedicated) pending leave request on Nov 18, 2026
        ("EMP022", date(2026, 11, 18), AvailabilityType.LEAVE, "CASUAL_LEAVE", ApprovalStatus.PENDING, "Pending family function request"),
    ]

    for emp_code, av_date, av_type, leave_t, stat, reason in avail_defs:
        emp = emp_map.get(emp_code)
        if emp:
            existing = db.scalar(
                select(EmployeeAvailability).where(
                    EmployeeAvailability.employee_id == emp.id,
                    EmployeeAvailability.date == av_date
                )
            )
            if not existing:
                db.add(EmployeeAvailability(
                    employee_id=emp.id,
                    date=av_date,
                    availability_type=av_type,
                    leave_type=leave_t,
                    status=stat,
                    reason=reason
                ))
    db.commit()
