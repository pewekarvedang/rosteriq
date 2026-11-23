// Enums matching backend SQLAlchemy models
export type OperatingCalendarRule =
  | 'EVERYDAY'
  | 'EXCEPT_PUBLIC_HOLIDAYS'
  | 'EXCEPT_SUNDAYS_AND_HOLIDAYS'
  | 'CUSTOM';

export type AvailabilityType = 'LEAVE' | 'COMP_OFF' | 'UNAVAILABLE';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RosterStatus = 'DRAFT' | 'VALIDATED' | 'PUBLISHED';

export type ConflictSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

// 1. Employee
export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string | null;
  pod_id?: number | null;
  pod_name?: string | null;
  max_weekly_hours: number;
  max_daily_hours: number;
  max_consecutive_days: number;
  default_weekly_off_days: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string;
  pod_id?: number | null;
  max_weekly_hours?: number;
  max_daily_hours?: number;
  max_consecutive_days?: number;
  default_weekly_off_days?: string;
  is_active?: boolean;
}

export interface EmployeeUpdate {
  employee_code?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  pod_id?: number | null;
  max_weekly_hours?: number;
  max_daily_hours?: number;
  max_consecutive_days?: number;
  default_weekly_off_days?: string;
  is_active?: boolean;
}

// 2. Pod
export interface Pod {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  lead_id?: number | null;
  lead_name?: string | null;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PodCreate {
  name: string;
  code: string;
  description?: string;
  lead_id?: number | null;
  is_active?: boolean;
}

export interface PodUpdate {
  name?: string;
  code?: string;
  description?: string;
  lead_id?: number | null;
  is_active?: boolean;
}

// 3. Brand
export interface Brand {
  id: number;
  name: string;
  code: string;
  client_name?: string | null;
  description?: string | null;
  process_count: number;
  assigned_employee_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandCreate {
  name: string;
  code: string;
  client_name?: string;
  description?: string;
  is_active?: boolean;
}

export interface BrandUpdate {
  name?: string;
  code?: string;
  client_name?: string;
  description?: string;
  is_active?: boolean;
}

// 4. Process
export interface Process {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessCreate {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
}

export interface ProcessUpdate {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

// 5. BrandProcess
export interface BrandProcess {
  id: number;
  brand_id: number;
  brand_name?: string | null;
  process_id: number;
  process_name?: string | null;
  operating_calendar: OperatingCalendarRule;
  custom_operating_days?: string | null;
  min_headcount_per_shift: number;
  requires_24_7: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandProcessCreate {
  brand_id: number;
  process_id: number;
  operating_calendar?: OperatingCalendarRule;
  custom_operating_days?: string;
  min_headcount_per_shift?: number;
  requires_24_7?: boolean;
  is_active?: boolean;
}

export interface BrandProcessUpdate {
  operating_calendar?: OperatingCalendarRule;
  custom_operating_days?: string;
  min_headcount_per_shift?: number;
  requires_24_7?: boolean;
  is_active?: boolean;
}

// 6. EmployeeAssignment
export interface EmployeeAssignment {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  brand_id: number;
  brand_name?: string | null;
  process_id: number;
  process_name?: string | null;
  is_primary: boolean;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAssignmentCreate {
  employee_id: number;
  brand_id: number;
  process_id: number;
  is_primary?: boolean;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
}

export interface EmployeeAssignmentUpdate {
  is_primary?: boolean;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
}

// 7. EmployeeAvailability
export interface EmployeeAvailability {
  id: number;
  employee_id: number;
  employee_name?: string | null;
  date: string;
  availability_type: AvailabilityType;
  leave_type?: string | null;
  status: ApprovalStatus;
  reason?: string | null;
  is_full_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAvailabilityCreate {
  employee_id: number;
  date: string;
  availability_type?: AvailabilityType;
  leave_type?: string;
  status?: ApprovalStatus;
  reason?: string;
  is_full_day?: boolean;
  start_time?: string;
  end_time?: string;
}

export interface EmployeeAvailabilityUpdate {
  availability_type?: AvailabilityType;
  leave_type?: string;
  status?: ApprovalStatus;
  reason?: string;
  is_full_day?: boolean;
  start_time?: string;
  end_time?: string;
}

// 8. PublicHoliday
export interface PublicHoliday {
  id: number;
  name: string;
  date: string;
  description?: string | null;
  is_optional: boolean;
  applicable_region: string;
  created_at: string;
  updated_at: string;
}

export interface PublicHolidayCreate {
  name: string;
  date: string;
  description?: string;
  is_optional?: boolean;
  applicable_region?: string;
}

export interface PublicHolidayUpdate {
  name?: string;
  date?: string;
  description?: string;
  is_optional?: boolean;
  applicable_region?: string;
}

// 9. Shift
export interface Shift {
  id: number;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  is_overnight: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftCreate {
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  is_overnight?: boolean;
  is_active?: boolean;
}

export interface ShiftUpdate {
  name?: string;
  code?: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  is_overnight?: boolean;
  is_active?: boolean;
}

// 10. Roster & Assignments
export interface RosterAssignmentProcess {
  id: number;
  brand_id: number;
  brand_name?: string | null;
  process_id: number;
  process_name?: string | null;
  allocated_hours: number;
  is_primary: boolean;
}

export interface RosterAssignment {
  id: number;
  roster_id: number;
  employee_id: number;
  employee_name?: string | null;
  date: string;
  shift_id?: number | null;
  shift_name?: string | null;
  is_off: boolean;
  off_reason?: string | null;
  is_locked: boolean;
  is_manual_override: boolean;
  notes?: string | null;
  processes: RosterAssignmentProcess[];
  created_at: string;
  updated_at: string;
}

export interface SchedulingConflict {
  id: number;
  roster_id: number;
  conflict_type: string;
  severity: ConflictSeverity;
  date: string;
  employee_id?: number | null;
  employee_name?: string | null;
  brand_id?: number | null;
  brand_name?: string | null;
  process_id?: number | null;
  process_name?: string | null;
  description: string;
  resolution_suggestion?: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Roster {
  id: number;
  name: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: RosterStatus;
  version: number;
  parent_roster_id?: number | null;
  created_by: string;
  validated_at?: string | null;
  published_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  total_assignments: number;
  total_conflicts: number;
}

export interface RosterDetail extends Roster {
  assignments: RosterAssignment[];
  conflicts: SchedulingConflict[];
}

export interface RosterCreate {
  name: string;
  month: number;
  year: number;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  notes?: string;
}

export interface RosterUpdate {
  name?: string;
  status?: RosterStatus;
  notes?: string;
}

// 11. OR-Tools Monthly Generator Response
export interface ShortageDetail {
  brand_id: number;
  brand_name: string;
  process_id: number;
  process_name: string;
  date: string;
  shift_id: number;
  required_headcount: number;
  assigned_headcount: number;
  missing_headcount: number;
}

export interface DayScheduleProcess {
  brand_id: number;
  brand_name: string;
  process_id: number;
  process_name: string;
  allocated_hours: number;
}

export interface DaySchedule {
  is_working: boolean;
  status: string; // "WORKING", "WEEKLY_OFF", "LEAVE", "HOLIDAY", "COMP_OFF", etc.
  shift?: string | null;
  shift_code?: string | null;
  processes: DayScheduleProcess[];
}

export interface EmployeeScheduleProfile {
  employee_id: number;
  employee_code: string;
  full_name: string;
  pod_id?: number | null;
  pod_name?: string | null;
  total_working_days: number;
  total_hours: number;
  total_weekly_offs: number;
  total_leaves: number;
  days: Record<string, DaySchedule>;
}

export interface BrandDailyAssignment {
  employee_id: number;
  employee_name: string;
  process_id: number;
  process_name: string;
  allocated_hours: number;
}

export interface BrandScheduleProfile {
  brand_id: number;
  brand_name: string;
  brand_code: string;
  daily_coverage: Record<string, BrandDailyAssignment[]>;
}

export interface ProcessCoverageProfile {
  process_id: number;
  process_name: string;
  process_code: string;
  total_slots_covered: number;
  total_slots_uncovered: number;
}

export interface PodScheduleProfile {
  pod_id: number;
  pod_name: string;
  pod_code: string;
  members: EmployeeScheduleProfile[];
}

export interface OptimizationStatistics {
  wall_time_seconds: number;
  num_branches: number;
  num_conflicts: number;
  objective_value: number;
  status_message: string;
  diagnostic_message?: string;
}

export interface MonthlyGenerationResponse {
  roster_id: number;
  name: string;
  month: number;
  year: number;
  generation_status: string;
  is_feasible: boolean;
  is_fully_covered: boolean;
  total_employees: number;
  total_required_staffing_slots: number;
  total_assigned_staffing_slots: number;
  coverage_percentage: number;
  total_shortage_count: number;
  shortage_details: ShortageDetail[];
  employee_wise_schedules: Record<string, EmployeeScheduleProfile>;
  brand_wise_schedules: Record<string, BrandScheduleProfile>;
  process_wise_coverage: Record<string, ProcessCoverageProfile>;
  pod_wise_schedules: Record<string, PodScheduleProfile>;
  solver_status: string;
  optimization_statistics: OptimizationStatistics;
}

// 12. Dashboard Summary
export interface DashboardStats {
  totalEmployees: number;
  activeBrands: number;
  operationalPods: number;
  totalProcesses: number;
  monthlyCoverage: number;
  schedulingConflicts: number;
  employeesOnLeave: number;
}
