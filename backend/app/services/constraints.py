from datetime import date, timedelta
from typing import Dict, List, Set, Tuple, Optional, Any
from ortools.sat.python import cp_model

from app.services.availability import EmployeeScheduleProfile
from app.services.coverage import DemandSlot
from app.services.optimization import OptimizationConfig
from app.models.shift import Shift
from app.models.roster_assignment import RosterAssignment


def apply_hard_constraints(
    model: cp_model.CpModel,
    dates: List[date],
    employees: List[EmployeeScheduleProfile],
    shifts: List[Shift],
    demands: List[DemandSlot],
    x: Dict[Tuple[int, date, int], cp_model.IntVar],               # (emp_id, date, shift_id) -> 0/1
    y: Dict[Tuple[int, int, int, date, int], cp_model.IntVar],       # (emp_id, brand_id, proc_id, date, shift_id) -> 0/1
    shortages: Dict[Tuple[int, int, date, int], cp_model.IntVar],   # (brand_id, proc_id, date, shift_id) -> int >= 0
    locked_assignments: Optional[Dict[Tuple[int, date], RosterAssignment]] = None,
    max_processes_per_shift: int = 3
) -> Dict[str, Any]:
    """
    Applies all mandatory constraints according to Task 3:
    1. Employee eligibility & active assignment scope
    2. Approved leaves, comp-offs, and unavailability
    3. At most one shift per calendar day
    4. Link shift work to process coverage (y <= x)
    5. Process workload capacity per shift (sum(y) <= max_processes_per_shift)
    6. Minimum staffing requirements with explicit shortages (distinct employees!)
    7. Overnight rest protection (Night shift d -> no Morning shift d+1)
    8. Maximum consecutive working days
    9. Weekly rest days and weekly workload hour limits
    10. Preservation of manually locked assignments
    """
    emp_map = {e.employee_id: e for e in employees}
    shift_map = {s.id: s for s in shifts}
    morning_shift = next((s for s in shifts if s.code == "MORNING"), None)
    night_shift = next((s for s in shifts if s.code == "NIGHT" or s.is_overnight), None)

    # 1. At Most One Shift Per Day & Linking to Process Coverage
    for emp in employees:
        for d in dates:
            day_shifts = [x[(emp.employee_id, d, s.id)] for s in shifts]
            # Constraint 1: At most one shift per day
            model.Add(sum(day_shifts) <= 1)

            # Constraint 2: Approved leaves, comp-offs, and unavailability
            if d in emp.unavailable_dates:
                for s in shifts:
                    model.Add(x[(emp.employee_id, d, s.id)] == 0)

            # Constraint 3: Linking shift execution to process coverage
            # An employee can only cover a process during shift s if working shift s
            for s in shifts:
                emp_shift_var = x[(emp.employee_id, d, s.id)]
                eligible_procs = emp.eligible_brand_processes_by_date.get(d, set())

                emp_proc_vars = []
                for (b_id, p_id) in eligible_procs:
                    if (emp.employee_id, b_id, p_id, d, s.id) in y:
                        y_var = y[(emp.employee_id, b_id, p_id, d, s.id)]
                        model.Add(y_var <= emp_shift_var)
                        emp_proc_vars.append(y_var)

                # Constraint 4: Maximum processes per shift capacity
                if emp_proc_vars:
                    model.Add(sum(emp_proc_vars) <= max_processes_per_shift)

    # 2. Demand Satisfaction & Distinct Employee Coverage
    demand_lookup: Dict[Tuple[int, int, date, int], DemandSlot] = {}
    for d_slot in demands:
        demand_lookup[(d_slot.brand_id, d_slot.process_id, d_slot.date, d_slot.shift_id)] = d_slot

    for (b_id, p_id, d, s_id), d_slot in demand_lookup.items():
        eligible_emp_vars = []
        for emp in employees:
            if (emp.employee_id, b_id, p_id, d, s_id) in y:
                eligible_emp_vars.append(y[(emp.employee_id, b_id, p_id, d, s_id)])

        shortage_var = shortages[(b_id, p_id, d, s_id)]

        # Constraint: sum(distinct employees assigned) + shortage == required headcount
        # Since y_{e} in {0, 1}, each employee contributes AT MOST 1 to this headcount!
        model.Add(sum(eligible_emp_vars) + shortage_var == d_slot.required_headcount)

    # 3. Overnight Shift Rest Protection
    if morning_shift and night_shift:
        for emp in employees:
            for idx in range(len(dates) - 1):
                d_curr = dates[idx]
                d_next = dates[idx + 1]
                night_var = x[(emp.employee_id, d_curr, night_shift.id)]
                morning_var = x[(emp.employee_id, d_next, morning_shift.id)]
                model.Add(night_var + morning_var <= 1)

    # 4. Maximum Consecutive Working Days
    for emp in employees:
        max_consec = emp.max_consecutive_days
        window_size = max_consec + 1
        if len(dates) >= window_size:
            for i in range(len(dates) - window_size + 1):
                window_dates = dates[i : i + window_size]
                window_work_vars = [
                    x[(emp.employee_id, wd, s.id)]
                    for wd in window_dates
                    for s in shifts
                ]
                model.Add(sum(window_work_vars) <= max_consec)

    # 5. Weekly Workload & Rest Constraints (by calendar week Mon-Sun)
    weeks: List[List[date]] = []
    current_week: List[date] = []
    for d in dates:
        current_week.append(d)
        if d.weekday() == 6:  # Sunday ends the week
            weeks.append(current_week)
            current_week = []
    if current_week:
        weeks.append(current_week)

    for emp in employees:
        for week_dates in weeks:
            week_days_count = len(week_dates)
            week_shift_vars = [
                x[(emp.employee_id, wd, s.id)]
                for wd in week_dates
                for s in shifts
            ]

            # In full weeks of 7 days: at least 1 weekly rest day (max 6 days working)
            if week_days_count >= 7:
                model.Add(sum(week_shift_vars) <= 6)
            else:
                model.Add(sum(week_shift_vars) <= week_days_count)

            # Weekly hours capacity constraint
            week_hour_terms = []
            for wd in week_dates:
                for s in shifts:
                    dur_int = int(round(s.duration_hours * 10))
                    week_hour_terms.append(dur_int * x[(emp.employee_id, wd, s.id)])

            # Upper bound for hours in this partial/full week:
            # cannot exceed employee's weekly hours or total days in this partial week * max daily hours
            scaled_max_hours = min(emp.max_weekly_hours, week_days_count * emp.max_daily_hours)
            scaled_max_int = int(round(scaled_max_hours * 10))
            model.Add(sum(week_hour_terms) <= scaled_max_int)

    # 6. Preservation of Manually Locked Assignments
    if locked_assignments:
        for (emp_id, d), la in locked_assignments.items():
            if emp_id not in emp_map:
                continue
            if la.is_off:
                for s in shifts:
                    model.Add(x[(emp_id, d, s.id)] == 0)
            elif la.shift_id:
                model.Add(x[(emp_id, d, la.shift_id)] == 1)
                for s in shifts:
                    if s.id != la.shift_id:
                        model.Add(x[(emp_id, d, s.id)] == 0)
                for rap in la.processes:
                    if (emp_id, rap.brand_id, rap.process_id, d, la.shift_id) in y:
                        model.Add(y[(emp_id, rap.brand_id, rap.process_id, d, la.shift_id)] == 1)

    return {"weeks": weeks}


def build_soft_objective_terms(
    model: cp_model.CpModel,
    dates: List[date],
    employees: List[EmployeeScheduleProfile],
    shifts: List[Shift],
    demands: List[DemandSlot],
    x: Dict[Tuple[int, date, int], cp_model.IntVar],
    y: Dict[Tuple[int, int, int, date, int], cp_model.IntVar],
    shortages: Dict[Tuple[int, int, date, int], cp_model.IntVar],
    config: OptimizationConfig
) -> cp_model.LinearExpr:
    """
    Constructs the weighted multi-objective expression according to Task 4 & Task 5:
    Priority 1: Coverage shortages
    Priority 3: Preferred weekly off violations
    Priority 4: Fairness in weekend shifts & total workload balancing
    """
    objective_terms = []

    # Priority 1: Coverage Shortages (Dominant penalty)
    for s_var in shortages.values():
        objective_terms.append(s_var * config.weight_coverage_shortage)

    # Priority 3: Preferred Weekly Off Violations
    for emp in employees:
        pref_offs = emp.default_weekly_off_days
        for d in dates:
            if d.weekday() in pref_offs:
                for s in shifts:
                    working_var = x[(emp.employee_id, d, s.id)]
                    objective_terms.append(working_var * config.weight_unpreferred_off)

    # Priority 4: Fair Weekend Distribution & Total Workload Balance
    weekend_dates = [d for d in dates if d.weekday() in [5, 6]]

    emp_total_shifts = {}
    emp_weekend_shifts = {}

    for emp in employees:
        total_vars = [x[(emp.employee_id, d, s.id)] for d in dates for s in shifts]
        emp_total_shifts[emp.employee_id] = sum(total_vars)

        if weekend_dates:
            wknd_vars = [x[(emp.employee_id, d, s.id)] for d in weekend_dates for s in shifts]
            emp_weekend_shifts[emp.employee_id] = sum(wknd_vars)

    # Workload balance: minimize deviation from average using AddAbsEquality
    if len(employees) > 1 and demands:
        total_demand_slots = sum(d.required_headcount for d in demands)
        target_shifts_per_emp = max(1, total_demand_slots // len(employees))

        for emp in employees:
            diff_var = model.NewIntVar(-len(dates), len(dates), f"diff_shift_{emp.employee_id}")
            abs_dev = model.NewIntVar(0, len(dates), f"abs_dev_{emp.employee_id}")
            model.Add(diff_var == emp_total_shifts[emp.employee_id] - target_shifts_per_emp)
            model.AddAbsEquality(abs_dev, diff_var)
            objective_terms.append(abs_dev * config.weight_workload_unbalance)

    # Weekend fairness: minimize deviation among peers using AddAbsEquality
    if len(employees) > 1 and weekend_dates:
        target_weekend_shifts = max(1, (len(weekend_dates) * 2) // len(employees))
        for emp in employees:
            wknd_diff = model.NewIntVar(-len(weekend_dates), len(weekend_dates), f"wknd_diff_{emp.employee_id}")
            wknd_abs = model.NewIntVar(0, len(weekend_dates), f"wknd_abs_{emp.employee_id}")
            model.Add(wknd_diff == emp_weekend_shifts[emp.employee_id] - target_weekend_shifts)
            model.AddAbsEquality(wknd_abs, wknd_diff)
            objective_terms.append(wknd_abs * config.weight_weekend_unbalance)

    return sum(objective_terms)
