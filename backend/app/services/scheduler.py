import time
from datetime import date
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, field
from ortools.sat.python import cp_model

from app.services.availability import EmployeeScheduleProfile
from app.services.coverage import DemandSlot
from app.services.optimization import OptimizationConfig, SolverStatistics
from app.services.constraints import apply_hard_constraints, build_soft_objective_terms
from app.models.shift import Shift
from app.models.roster_assignment import RosterAssignment


@dataclass
class DecodedAssignment:
    employee_id: int
    date: date
    shift_id: Optional[int]
    is_off: bool
    off_reason: Optional[str]
    is_locked: bool
    processes: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class DecodedShortage:
    brand_id: int
    process_id: int
    date: date
    shift_id: int
    required_headcount: int
    assigned_headcount: int
    missing_headcount: int


@dataclass
class ScheduleSolution:
    status: str  # OPTIMAL, FEASIBLE, INFEASIBLE, MODEL_INVALID
    is_feasible: bool
    is_fully_covered: bool
    total_demand_slots: int
    total_assigned_slots: int
    total_shortages: int
    coverage_percentage: float
    assignments: List[DecodedAssignment]
    shortages: List[DecodedShortage]
    solver_stats: SolverStatistics
    diagnostic_message: str


class WorkforceScheduler:
    """
    Core Operations Research Constraint Programming Engine using Google OR-Tools CP-SAT.
    Deterministic, mathematical optimization with lexicographic multi-priority objectives.
    """

    def __init__(
        self,
        dates: List[date],
        employees: List[EmployeeScheduleProfile],
        shifts: List[Shift],
        demands: List[DemandSlot],
        config: Optional[OptimizationConfig] = None,
        locked_assignments: Optional[Dict[Tuple[int, date], RosterAssignment]] = None
    ):
        self.dates = sorted(dates)
        self.employees = employees
        self.shifts = shifts
        self.demands = demands
        self.config = config or OptimizationConfig()
        self.locked_assignments = locked_assignments or {}

        self.model = cp_model.CpModel()
        self.x: Dict[Tuple[int, date, int], cp_model.IntVar] = {}
        self.y: Dict[Tuple[int, int, int, date, int], cp_model.IntVar] = {}
        self.shortages: Dict[Tuple[int, int, date, int], cp_model.IntVar] = {}

    def _create_variables(self) -> None:
        """Instantiates CP-SAT decision and auxiliary shortage variables."""
        # 1. Shift assignment variable: x[emp_id, date, shift_id] in {0, 1}
        for emp in self.employees:
            for d in self.dates:
                for s in self.shifts:
                    var_name = f"x_e{emp.employee_id}_d{d}_s{s.id}"
                    self.x[(emp.employee_id, d, s.id)] = self.model.NewBoolVar(var_name)

        # 2. Process coverage variable: y[emp_id, brand_id, proc_id, date, shift_id] in {0, 1}
        # Only created for eligible (emp, brand, proc) on date d
        for emp in self.employees:
            for d in self.dates:
                eligible_procs = emp.eligible_brand_processes_by_date.get(d, set())
                for (b_id, p_id) in eligible_procs:
                    for s in self.shifts:
                        var_name = f"y_e{emp.employee_id}_b{b_id}_p{p_id}_d{d}_s{s.id}"
                        self.y[(emp.employee_id, b_id, p_id, d, s.id)] = self.model.NewBoolVar(var_name)

        # 3. Explicit Shortage variables for each demand requirement
        for d_slot in self.demands:
            key = (d_slot.brand_id, d_slot.process_id, d_slot.date, d_slot.shift_id)
            if key not in self.shortages:
                var_name = f"shortage_b{d_slot.brand_id}_p{d_slot.process_id}_d{d_slot.date}_s{d_slot.shift_id}"
                self.shortages[key] = self.model.NewIntVar(0, d_slot.required_headcount, var_name)

    def solve(self) -> ScheduleSolution:
        """Builds and executes the deterministic CP-SAT optimization model."""
        start_time = time.time()
        self._create_variables()

        # Apply Hard Constraints
        apply_hard_constraints(
            model=self.model,
            dates=self.dates,
            employees=self.employees,
            shifts=self.shifts,
            demands=self.demands,
            x=self.x,
            y=self.y,
            shortages=self.shortages,
            locked_assignments=self.locked_assignments
        )

        # Build Multi-Objective
        objective_expr = build_soft_objective_terms(
            model=self.model,
            dates=self.dates,
            employees=self.employees,
            shifts=self.shifts,
            demands=self.demands,
            x=self.x,
            y=self.y,
            shortages=self.shortages,
            config=self.config
        )
        self.model.Minimize(objective_expr)

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.config.solver_timeout_seconds
        solver.parameters.num_search_workers = self.config.num_search_workers
        solver.parameters.relative_gap_limit = 0.05
        solver.parameters.log_search_progress = False

        status_code = solver.Solve(self.model)
        wall_time = time.time() - start_time

        status_name = solver.StatusName(status_code)

        if status_code in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return self._decode_solution(solver, status_name, wall_time)
        elif status_code == cp_model.INFEASIBLE:
            return self._diagnose_infeasibility(wall_time)
        else:
            return ScheduleSolution(
                status="UNKNOWN",
                is_feasible=False,
                is_fully_covered=False,
                total_demand_slots=sum(d.required_headcount for d in self.demands),
                total_assigned_slots=0,
                total_shortages=sum(d.required_headcount for d in self.demands),
                coverage_percentage=0.0,
                assignments=[],
                shortages=[],
                solver_stats=SolverStatistics(
                    solver_status="UNKNOWN",
                    is_fully_covered=False,
                    total_shortages=sum(d.required_headcount for d in self.demands),
                    wall_time_seconds=wall_time,
                    num_branches=int(solver.NumBranches()),
                    num_conflicts=int(solver.NumConflicts()),
                    objective_value=float("inf"),
                    status_message=f"Solver stopped with status: {status_name}"
                ),
                diagnostic_message=f"Solver stopped before finding a valid solution: {status_name}"
            )

    def _decode_solution(
        self,
        solver: cp_model.CpSolver,
        status_name: str,
        wall_time: float
    ) -> ScheduleSolution:
        """Extracts decision variable assignments and coverage statistics."""
        assignments: List[DecodedAssignment] = []
        emp_map = {e.employee_id: e for e in self.employees}
        shift_map = {s.id: s for s in self.shifts}

        for emp in self.employees:
            for d in self.dates:
                # Find which shift was assigned
                assigned_shift_id = None
                for s in self.shifts:
                    if solver.Value(self.x[(emp.employee_id, d, s.id)]) == 1:
                        assigned_shift_id = s.id
                        break

                is_locked = False
                la = self.locked_assignments.get((emp.employee_id, d))
                if la:
                    is_locked = la.is_locked

                if assigned_shift_id is None:
                    # Off day, Leave, or Manually Locked Off
                    off_reason = (la.off_reason if la and la.off_reason else emp.unavailable_reasons.get(d, "WEEKLY_OFF"))
                    assignments.append(DecodedAssignment(
                        employee_id=emp.employee_id,
                        date=d,
                        shift_id=None,
                        is_off=True,
                        off_reason=off_reason,
                        is_locked=is_locked
                    ))
                else:
                    # Working shift: find assigned processes
                    assigned_shift = shift_map[assigned_shift_id]
                    assigned_procs = []
                    eligible_procs = emp.eligible_brand_processes_by_date.get(d, set())

                    for (b_id, p_id) in eligible_procs:
                        key = (emp.employee_id, b_id, p_id, d, assigned_shift_id)
                        if key in self.y and solver.Value(self.y[key]) == 1:
                            assigned_procs.append((b_id, p_id))

                    # Calculate allocated hours per process within shift capacity
                    proc_items = []
                    proc_count = max(1, len(assigned_procs))
                    hours_each = round(assigned_shift.duration_hours / proc_count, 1)

                    for idx, (b_id, p_id) in enumerate(assigned_procs):
                        proc_items.append({
                            "brand_id": b_id,
                            "process_id": p_id,
                            "allocated_hours": hours_each,
                            "is_primary": (idx == 0)
                        })

                    assignments.append(DecodedAssignment(
                        employee_id=emp.employee_id,
                        date=d,
                        shift_id=assigned_shift_id,
                        is_off=False,
                        off_reason=None,
                        is_locked=is_locked,
                        processes=proc_items
                    ))

        # Decode Shortages
        decoded_shortages: List[DecodedShortage] = []
        total_shortage_headcount = 0
        total_demanded_headcount = 0

        for d_slot in self.demands:
            key = (d_slot.brand_id, d_slot.process_id, d_slot.date, d_slot.shift_id)
            total_demanded_headcount += d_slot.required_headcount
            shortage_val = int(solver.Value(self.shortages[key]))

            if shortage_val > 0:
                total_shortage_headcount += shortage_val
                assigned_count = d_slot.required_headcount - shortage_val
                decoded_shortages.append(DecodedShortage(
                    brand_id=d_slot.brand_id,
                    process_id=d_slot.process_id,
                    date=d_slot.date,
                    shift_id=d_slot.shift_id,
                    required_headcount=d_slot.required_headcount,
                    assigned_headcount=assigned_count,
                    missing_headcount=shortage_val
                ))

        assigned_slots = total_demanded_headcount - total_shortage_headcount
        cov_pct = round((assigned_slots / total_demanded_headcount * 100.0), 2) if total_demanded_headcount > 0 else 100.0
        is_fully_covered = (total_shortage_headcount == 0)

        status_msg = (
            "Optimal roster found with 100% coverage."
            if is_fully_covered and status_name == "OPTIMAL"
            else f"Feasible schedule generated with {total_shortage_headcount} unstaffed slots ({cov_pct}% coverage)."
        )

        return ScheduleSolution(
            status=status_name,
            is_feasible=True,
            is_fully_covered=is_fully_covered,
            total_demand_slots=total_demanded_headcount,
            total_assigned_slots=assigned_slots,
            total_shortages=total_shortage_headcount,
            coverage_percentage=cov_pct,
            assignments=assignments,
            shortages=decoded_shortages,
            solver_stats=SolverStatistics(
                solver_status=status_name,
                is_fully_covered=is_fully_covered,
                total_shortages=total_shortage_headcount,
                wall_time_seconds=round(wall_time, 3),
                num_branches=int(solver.NumBranches()),
                num_conflicts=int(solver.NumConflicts()),
                objective_value=float(solver.ObjectiveValue()),
                status_message=status_msg
            ),
            diagnostic_message=status_msg
        )

    def _diagnose_infeasibility(self, wall_time: float) -> ScheduleSolution:
        """Analyzes locked assignments and leaves to provide actionable diagnostic feedback when hard constraints conflict."""
        diagnostics = []
        for (emp_id, d), la in self.locked_assignments.items():
            emp = next((e for e in self.employees if e.employee_id == emp_id), None)
            if emp and d in emp.unavailable_dates and not la.is_off:
                diagnostics.append(
                    f"Employee '{emp.full_name}' has a manually locked working assignment on {d} "
                    f"which directly conflicts with approved leave: {emp.unavailable_reasons.get(d)}"
                )

        if not diagnostics:
            diagnostics.append(
                "Infeasibility detected: mandatory constraints (such as consecutive working days or rest hours) "
                "cannot be satisfied under current assignment locking and capacity limits."
            )

        diag_str = " | ".join(diagnostics)

        return ScheduleSolution(
            status="INFEASIBLE",
            is_feasible=False,
            is_fully_covered=False,
            total_demand_slots=sum(d.required_headcount for d in self.demands),
            total_assigned_slots=0,
            total_shortages=sum(d.required_headcount for d in self.demands),
            coverage_percentage=0.0,
            assignments=[],
            shortages=[],
            solver_stats=SolverStatistics(
                solver_status="INFEASIBLE",
                is_fully_covered=False,
                total_shortages=sum(d.required_headcount for d in self.demands),
                wall_time_seconds=round(wall_time, 3),
                num_branches=0,
                num_conflicts=0,
                objective_value=float("inf"),
                status_message="Hard scheduling constraints are mathematically incompatible."
            ),
            diagnostic_message=diag_str
        )
