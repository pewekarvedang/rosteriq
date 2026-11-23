from dataclasses import dataclass


@dataclass
class OptimizationConfig:
    """Configurable weights for multi-objective lexicographic workforce optimization."""
    # Priority 1: Coverage shortages (Dominant penalty ensuring best-effort draft generation)
    weight_coverage_shortage: int = 1_000_000

    # Priority 2: Hard constraints (Enforced strictly, but soft overage penalties for diagnostic slack if needed)
    weight_consecutive_days_overage: int = 25_000
    weight_weekly_hours_overage: int = 20_000

    # Priority 3: Employee preference satisfaction
    weight_unpreferred_off: int = 500           # Working on employee's preferred off day (e.g. Sunday)
    weight_unpreferred_shift: int = 100         # Non-standard shift assignment

    # Priority 4: Fairness & workload balance
    weight_workload_unbalance: int = 200        # Variance in total working days across peers
    weight_weekend_unbalance: int = 250         # Variance in weekend shifts worked

    # Priority 5: Stability / Minimize churn
    weight_churn: int = 50                      # Unnecessary change from previous roster version

    # Solver parameters
    solver_timeout_seconds: float = 30.0
    num_search_workers: int = 4
    enable_two_phase_lexicographic: bool = True # Phase 1: min shortage, Phase 2: optimize balance


@dataclass
class SolverStatistics:
    solver_status: str                         # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    is_fully_covered: bool
    total_shortages: int
    wall_time_seconds: float
    num_branches: int
    num_conflicts: int
    objective_value: float
    status_message: str
