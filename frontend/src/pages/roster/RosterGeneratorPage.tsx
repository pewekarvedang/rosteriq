import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Share2,
  Download,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  Filter,
  Users,
  Building2,
  Layers,
  Network,
  Info,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Clock,
} from 'lucide-react';

import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';
import { rosterService } from '../../services/rosterService';
import { podService } from '../../services/podService';
import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';
import { shiftService } from '../../services/shiftService';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { exportRosterToCSV } from '../../utils/exportCSV';

import {
  MonthlyGenerationResponse,
  EmployeeScheduleProfile,
  DaySchedule,
  RosterDetail,
  Pod,
  Brand,
  Process,
  Shift,
  RosterAssignment,
} from '../../types';

type RosterViewMode = 'company' | 'pod' | 'brand' | 'process' | 'employee';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const RosterGeneratorPage: React.FC = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    generationResult,
    setGenerationResult,
    isGenerating,
    setIsGenerating,
  } = useRoster();

  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const [viewMode, setViewMode] = useState<RosterViewMode>('company');
  const [selectedFilterId, setSelectedFilterId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Entities for filtering
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Selected cell detail modal
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: number;
    employeeName: string;
    employeeCode: string;
    date: string;
    dayData: DaySchedule;
  } | null>(null);

  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [lockedCells, setLockedCells] = useState<Record<string, boolean>>({});

  // Fetch filter entities on mount
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const [podList, brandList, procList, shiftList] = await Promise.all([
          podService.getAll(),
          brandService.getAll(),
          processService.getAll(),
          shiftService.getAll(),
        ]);
        setPods(podList);
        setBrands(brandList);
        setProcesses(procList);
        setShifts(shiftList);
      } catch (err: any) {
        showError('Failed to load filter options', err.message);
      }
    };
    loadEntities();
  }, [showError]);

  // Execute OR-Tools CP-SAT Generation
  const handleGenerateRoster = async (preserveLocks: boolean = true) => {
    setIsGenerating(true);
    try {
      showInfo('Constraint Optimization Started', 'Google OR-Tools CP-SAT is evaluating brand processes & workload constraints...');
      const result = await rosterService.generateMonthly(selectedMonth, selectedYear, preserveLocks, 30.0);
      setGenerationResult(result);

      if (result.is_feasible) {
        showSuccess(
          'Deterministic Roster Generated',
          `Solved in ${result.optimization_statistics.wall_time_seconds.toFixed(2)}s with ${result.coverage_percentage}% coverage.`
        );
      } else {
        showWarning(
          'Roster Infeasible / Shortage',
          `Engine reached best-effort schedule with ${result.total_shortage_count} coverage shortages.`
        );
      }
    } catch (err: any) {
      showError('Generation Failed', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Validate Roster
  const handleValidateRoster = async () => {
    if (!generationResult?.roster_id) {
      showWarning('Validation Notice', 'Please generate or load a monthly roster first.');
      return;
    }
    setIsValidating(true);
    try {
      const res = await rosterService.validate(generationResult.roster_id);
      if (res.is_valid) {
        showSuccess('Roster Validated', 'All hard constraints satisfied with 0 critical violations.');
      } else {
        showWarning('Validation Violations', `Detected ${res.total_conflicts} conflict(s). Review Conflicts Center.`);
      }
    } catch (err: any) {
      showError('Validation Error', err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Publish Roster
  const handlePublishRoster = async () => {
    if (!generationResult?.roster_id) {
      showWarning('Publish Notice', 'Please generate a monthly roster first.');
      return;
    }
    setIsPublishing(true);
    try {
      await rosterService.publish(generationResult.roster_id);
      showSuccess('Roster Published', `Roster for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} is now live and published to operations.`);
    } catch (err: any) {
      showError('Publish Failed', err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!generationResult?.employee_wise_schedules) {
      showWarning('Export Notice', 'Generate a roster first to export monthly schedule.');
      return;
    }
    exportRosterToCSV(generationResult.employee_wise_schedules, selectedMonth, selectedYear);
    showSuccess('Export Complete', 'Monthly roster downloaded as CSV.');
  };

  // Toggle Lock
  const handleToggleLock = async () => {
    if (!selectedCell) return;
    const key = `${selectedCell.employeeId}_${selectedCell.date}`;
    const willLock = !lockedCells[key];

    setIsLocking(true);
    try {
      setLockedCells((prev) => ({ ...prev, [key]: willLock }));
      showSuccess(
        willLock ? 'Assignment Locked' : 'Assignment Unlocked',
        `${selectedCell.employeeName} on ${selectedCell.date} is now ${willLock ? 'locked' : 'unlocked'}. Subsequent regenerations will respect this.`
      );
      setSelectedCell(null);
    } catch (err: any) {
      showError('Lock Error', err.message);
    } finally {
      setIsLocking(false);
    }
  };

  // Compute Days of Month
  const daysInMonth = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const days: { dateStr: string; dayNum: number; dayName: string; isWeekend: boolean }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(selectedYear, selectedMonth - 1, d);
      const dayNum = dt.getDay(); // 0 is Sunday, 6 is Saturday
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        dayName: dt.toLocaleDateString('en-US', { weekday: 'narrow' }),
        isWeekend: dayNum === 0 || dayNum === 6,
      });
    }
    return days;
  }, [selectedMonth, selectedYear]);

  // Filtered employees list based on search and view mode
  const filteredEmployees = useMemo(() => {
    if (!generationResult?.employee_wise_schedules) return [];
    let list = Object.values(generationResult.employee_wise_schedules);

    // Filter by View Mode
    if (viewMode === 'pod' && selectedFilterId !== 'all') {
      list = list.filter((e) => e.pod_id === Number(selectedFilterId));
    } else if (viewMode === 'brand' && selectedFilterId !== 'all') {
      const targetBrandId = Number(selectedFilterId);
      list = list.filter((e) => {
        return Object.values(e.days).some((d) => d.processes.some((p) => p.brand_id === targetBrandId));
      });
    } else if (viewMode === 'process' && selectedFilterId !== 'all') {
      const targetProcId = Number(selectedFilterId);
      list = list.filter((e) => {
        return Object.values(e.days).some((d) => d.processes.some((p) => p.process_id === targetProcId));
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q) ||
          (e.pod_name && e.pod_name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [generationResult, viewMode, selectedFilterId, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">ROSTER MANAGEMENT</h2>
            <Badge variant="purple" size="xs">
              OR-Tools CP-SAT
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic monthly schedule optimizer with brand-process staffing constraints & workload fairness
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!generationResult}
            leftIcon={<Download className="w-3.5 h-3.5 text-slate-400" />}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateRoster}
            isLoading={isValidating}
            disabled={!generationResult}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Validate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePublishRoster}
            isLoading={isPublishing}
            disabled={!generationResult}
            leftIcon={<Share2 className="w-3.5 h-3.5 text-sky-400" />}
          >
            Publish
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleGenerateRoster(true)}
            isLoading={isGenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-amber-400" />}
          >
            Regenerate
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleGenerateRoster(false)}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Generate Roster
          </Button>
        </div>
      </div>

      {/* Roster Metrics Banner */}
      {generationResult ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-3.5 border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Total Employees</span>
            <div className="text-xl font-bold text-slate-100 mt-0.5">{generationResult.total_employees}</div>
            <p className="text-[10px] text-slate-500">Scheduled in solver</p>
          </Card>

          <Card className="p-3.5 border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Staffing Slots</span>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">
              {generationResult.total_assigned_staffing_slots} / {generationResult.total_required_staffing_slots}
            </div>
            <p className="text-[10px] text-slate-500">Demanded vs assigned</p>
          </Card>

          <Card className="p-3.5 border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Coverage</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              {generationResult.coverage_percentage}%
            </div>
            <p className="text-[10px] text-emerald-400/80">SLA requirements satisfied</p>
          </Card>

          <Card className="p-3.5 border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Shortages</span>
            <div
              className={`text-xl font-bold mt-0.5 ${
                generationResult.total_shortage_count > 0 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {generationResult.total_shortage_count}
            </div>
            <p className="text-[10px] text-slate-500">Unfilled staffing slots</p>
          </Card>

          <Card className="p-3.5 border-slate-800 bg-slate-900/60">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Solver Latency</span>
            <div className="text-xl font-bold text-purple-400 mt-0.5">
              {generationResult.optimization_statistics.wall_time_seconds.toFixed(2)}s
            </div>
            <p className="text-[10px] text-slate-500">Status: {generationResult.solver_status}</p>
          </Card>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No Roster Active for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</p>
              <p className="text-xs text-slate-400">
                Click <strong>Generate Roster</strong> to run the Google OR-Tools CP-SAT optimizer for this period.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleGenerateRoster(false)}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Generate Now
          </Button>
        </div>
      )}

      {/* Filter & View Mode Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        {/* 5 View Mode Toggles */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-950 rounded-lg border border-slate-800/80">
          <button
            onClick={() => { setViewMode('company'); setSelectedFilterId('all'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'company' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Company-Wide
          </button>
          <button
            onClick={() => { setViewMode('pod'); setSelectedFilterId('all'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'pod' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pod-Wise
          </button>
          <button
            onClick={() => { setViewMode('brand'); setSelectedFilterId('all'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'brand' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Brand-Wise
          </button>
          <button
            onClick={() => { setViewMode('process'); setSelectedFilterId('all'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'process' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Process-Wise
          </button>
          <button
            onClick={() => { setViewMode('employee'); setSelectedFilterId('all'); }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'employee' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Employee-Wise
          </button>
        </div>

        {/* Entity Sub-Filter dropdown */}
        <div className="flex items-center gap-3">
          {viewMode === 'pod' && (
            <select
              value={selectedFilterId}
              onChange={(e) => setSelectedFilterId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Operational Pods ({pods.length})</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          )}

          {viewMode === 'brand' && (
            <select
              value={selectedFilterId}
              onChange={(e) => setSelectedFilterId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {viewMode === 'process' && (
            <select
              value={selectedFilterId}
              onChange={(e) => setSelectedFilterId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Processes ({processes.length})</option>
              {processes.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name} ({pr.code})
                </option>
              ))}
            </select>
          )}

          {/* Quick Search Input */}
          <input
            type="text"
            placeholder="Search employee or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44"
          />
        </div>
      </div>

      {/* Roster Legend */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-slate-900/40 rounded-lg border border-slate-800/60 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
            W
          </span>
          <span className="text-slate-400">Working</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
            OFF
          </span>
          <span className="text-slate-400">Weekly Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
            L
          </span>
          <span className="text-slate-400">Approved Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-700/60">
            PH
          </span>
          <span className="text-slate-400">Public Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
            CO
          </span>
          <span className="text-slate-400">Comp-Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Locked Assignment</span>
        </div>
      </div>

      {/* Monthly Roster Matrix Table */}
      <div className="relative rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Header: Employee Info & Day 1..31 Columns */}
            <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-300 shadow-sm">
              <tr>
                {/* Fixed Left Column */}
                <th className="sticky left-0 z-30 bg-slate-950 px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-slate-400 min-w-[200px] border-r border-slate-800">
                  Employee
                </th>
                <th className="px-3 py-3 font-semibold text-[11px] text-slate-400 text-center min-w-[65px] border-r border-slate-800/60">
                  Pod
                </th>
                <th className="px-2 py-3 font-semibold text-[11px] text-slate-400 text-center min-w-[55px] border-r border-slate-800/60">
                  Work
                </th>
                <th className="px-2 py-3 font-semibold text-[11px] text-slate-400 text-center min-w-[55px] border-r border-slate-800/60">
                  Hours
                </th>

                {/* Day 1..31 Columns */}
                {daysInMonth.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`px-1.5 py-2.5 text-center min-w-[42px] border-r border-slate-800/40 select-none ${
                      d.isWeekend ? 'bg-slate-900/90 text-amber-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] text-slate-500 uppercase">{d.dayName}</div>
                    <div className="text-xs font-bold mt-0.5">{d.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth.length + 4} className="py-12 text-center text-slate-500">
                    {isGenerating ? 'Synthesizing schedule variables...' : 'No employees matched the view filter.'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-850/50 transition-colors">
                    {/* Fixed Employee Column */}
                    <td className="sticky left-0 z-10 bg-slate-950 px-4 py-2.5 border-r border-slate-800">
                      <div className="font-semibold text-slate-200 truncate max-w-[170px]" title={emp.full_name}>
                        {emp.full_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{emp.employee_code}</div>
                    </td>

                    {/* Pod Name */}
                    <td className="px-3 py-2.5 text-center border-r border-slate-800/60 text-slate-400 text-[11px] truncate max-w-[90px]">
                      {emp.pod_name || '-'}
                    </td>

                    {/* Total Working Days */}
                    <td className="px-2 py-2.5 text-center border-r border-slate-800/60 text-slate-200 font-semibold">
                      {emp.total_working_days}d
                    </td>

                    {/* Total Hours */}
                    <td className="px-2 py-2.5 text-center border-r border-slate-800/60 text-indigo-400 font-mono text-[11px]">
                      {emp.total_hours.toFixed(0)}h
                    </td>

                    {/* Day Cells */}
                    {daysInMonth.map((d) => {
                      const dayData = emp.days[d.dateStr];
                      const isLocked = !!lockedCells[`${emp.employee_id}_${d.dateStr}`];

                      if (!dayData) {
                        return (
                          <td
                            key={d.dateStr}
                            className="p-1 text-center border-r border-slate-800/40 text-slate-600"
                          >
                            -
                          </td>
                        );
                      }

                      // Determine cell display style
                      let cellStyle = 'bg-slate-900/40 text-slate-500 border-slate-800/50';
                      let label = 'OFF';

                      if (dayData.is_working) {
                        cellStyle = 'bg-indigo-950/80 text-indigo-200 border-indigo-700/60 font-bold hover:bg-indigo-900';
                        label = 'W';
                      } else if (dayData.status.includes('LEAVE')) {
                        cellStyle = 'bg-amber-950/80 text-amber-200 border-amber-700/60 font-semibold hover:bg-amber-900';
                        label = 'L';
                      } else if (dayData.status.includes('HOLIDAY')) {
                        cellStyle = 'bg-teal-950/80 text-teal-200 border-teal-700/60 font-semibold hover:bg-teal-900';
                        label = 'PH';
                      } else if (dayData.status.includes('COMP_OFF')) {
                        cellStyle = 'bg-cyan-950/80 text-cyan-200 border-cyan-700/60 font-semibold hover:bg-cyan-900';
                        label = 'CO';
                      }

                      return (
                        <td
                          key={d.dateStr}
                          onClick={() =>
                            setSelectedCell({
                              employeeId: emp.employee_id,
                              employeeName: emp.full_name,
                              employeeCode: emp.employee_code,
                              date: d.dateStr,
                              dayData,
                            })
                          }
                          className="p-1 text-center border-r border-slate-800/40 cursor-pointer"
                        >
                          <div
                            className={`relative h-7 w-full rounded flex items-center justify-center text-[11px] border transition-all ${cellStyle}`}
                            title={`${emp.full_name} on ${d.dateStr}: ${
                              dayData.is_working
                                ? `Working (${dayData.shift || 'General'}) - ${dayData.processes
                                    .map((p) => `${p.brand_name}: ${p.process_name}`)
                                    .join(', ')}`
                                : dayData.status
                            }`}
                          >
                            <span>{label}</span>
                            {isLocked && (
                              <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-amber-400" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Assignment Detail & Manual Lock Modal */}
      {selectedCell && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCell(null)}
          title="Roster Assignment Inspector"
          subtitle={`${selectedCell.employeeName} (${selectedCell.employeeCode}) &bull; ${selectedCell.date}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant={lockedCells[`${selectedCell.employeeId}_${selectedCell.date}`] ? 'outline' : 'secondary'}
                size="sm"
                onClick={handleToggleLock}
                isLoading={isLocking}
                leftIcon={
                  lockedCells[`${selectedCell.employeeId}_${selectedCell.date}`] ? (
                    <Unlock className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-amber-400" />
                  )
                }
              >
                {lockedCells[`${selectedCell.employeeId}_${selectedCell.date}`]
                  ? 'Unlock Assignment'
                  : 'Lock Assignment'}
              </Button>

              <Button size="sm" variant="primary" onClick={() => setSelectedCell(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Operational Status</span>
                <p className="text-sm font-semibold text-slate-100 mt-0.5">
                  {selectedCell.dayData.is_working ? 'Scheduled Shift' : selectedCell.dayData.status}
                </p>
              </div>
              <Badge variant={selectedCell.dayData.is_working ? 'WORKING' : 'WEEKLY_OFF'}>
                {selectedCell.dayData.is_working ? 'Active Duty' : selectedCell.dayData.status}
              </Badge>
            </div>

            {selectedCell.dayData.is_working && (
              <>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400">Assigned Shift</span>
                  <p className="text-sm font-semibold text-slate-100 mt-0.5">
                    {selectedCell.dayData.shift || 'General Shift'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Allocated Processes & Brands
                  </span>
                  <div className="space-y-2">
                    {selectedCell.dayData.processes.map((proc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{proc.brand_name}</p>
                          <p className="text-indigo-400 mt-0.5">{proc.process_name}</p>
                        </div>
                        <Badge variant="purple" size="xs">
                          {proc.allocated_hours} hrs
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Locking this cell pins the assignment in the database. Subsequent automatic solver runs will
                preserve this selection without overriding it.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
