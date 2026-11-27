import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Share2,
  Download,
  Lock,
  Unlock,
  Info,
  ShieldCheck,
} from 'lucide-react';

import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';
import { rosterService } from '../../services/rosterService';
import { podService } from '../../services/podService';
import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';

import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  DaySchedule,
  Pod,
  Brand,
  Process,
} from '../../types';

type RosterViewMode = 'company' | 'pod' | 'brand' | 'process' | 'employee';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const RosterGeneratorPage: React.FC = () => {
  const {
    selectedMonth,
    selectedYear,
    generationResult,
    setGenerationResult,
    isGenerating,
    setIsGenerating,
  } = useRoster();

  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const [viewMode, setViewMode] = useState<RosterViewMode>('company');
  const [selectedFilterId, setSelectedFilterId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

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

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const [podList, brandList, procList] = await Promise.all([
          podService.getAll(),
          brandService.getAll(),
          processService.getAll(),
        ]);
        setPods(podList);
        setBrands(brandList);
        setProcesses(procList);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load filter lists';
        showError('Failed to load filter options', message);
      }
    };
    loadEntities();
  }, [showError]);

  const handleGenerateRoster = async (preserveLocks: boolean = true) => {
    setIsGenerating(true);
    try {
      showInfo(
        'Solver Running',
        'Checking brand operating calendars, weekly hour caps, and leave blocks...'
      );
      const result = await rosterService.generateMonthly(selectedMonth, selectedYear, preserveLocks, 30.0);
      setGenerationResult(result);

      if (result.is_feasible) {
        showSuccess(
          'Monthly Roster Ready',
          `Solved in ${result.optimization_statistics.wall_time_seconds.toFixed(2)}s with ${result.coverage_percentage}% coverage.`
        );
      } else {
        showWarning(
          'Shortages Detected',
          `Best-effort schedule produced with ${result.total_shortage_count} open staffing slot(s).`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Solver execution failed';
      showError('Generation Failed', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleValidateRoster = async () => {
    if (!generationResult?.roster_id) {
      showWarning('Validation Notice', 'Generate or load a monthly roster first.');
      return;
    }
    setIsValidating(true);
    try {
      const res = await rosterService.validate(generationResult.roster_id);
      if (res.is_valid) {
        showSuccess('Roster Validated', 'All hard constraints satisfied with 0 open conflicts.');
      } else {
        showWarning('Validation Violations', `Found ${res.total_conflicts} conflict(s). Review Conflicts Center.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      showError('Validation Error', message);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePublishRoster = async () => {
    if (!generationResult?.roster_id) {
      showWarning('Publish Notice', 'Generate a monthly roster first.');
      return;
    }
    setIsPublishing(true);
    try {
      await rosterService.publish(generationResult.roster_id);
      showSuccess(
        'Roster Published',
        `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} schedule is now marked live.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      showError('Publish Failed', message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!generationResult?.employee_wise_schedules) {
      showWarning('Export Notice', 'Generate a roster first to download CSV.');
      return;
    }
    const { exportRosterToCSV } = await import('../../utils/exportCSV');
    exportRosterToCSV(generationResult.employee_wise_schedules, selectedMonth, selectedYear);
    showSuccess('Export Complete', 'Monthly roster downloaded as CSV.');
  };

  const handleToggleLock = async () => {
    if (!selectedCell) return;
    const key = `${selectedCell.employeeId}_${selectedCell.date}`;
    const willLock = !lockedCells[key];

    setIsLocking(true);
    try {
      setLockedCells((prev) => ({ ...prev, [key]: willLock }));
      showSuccess(
        willLock ? 'Shift Locked' : 'Shift Unlocked',
        `${selectedCell.employeeName} on ${selectedCell.date} is now ${willLock ? 'pinned' : 'unpinned'}.`
      );
      setSelectedCell(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to lock assignment';
      showError('Lock Error', message);
    } finally {
      setIsLocking(false);
    }
  };

  const daysInMonth = useMemo(() => {
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const days: { dateStr: string; dayNum: number; dayName: string; isWeekend: boolean }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dt = new Date(selectedYear, selectedMonth - 1, d);
      const dayNum = dt.getDay();
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

  const filteredEmployees = useMemo(() => {
    if (!generationResult?.employee_wise_schedules) return [];
    let list = Object.values(generationResult.employee_wise_schedules);

    if (viewMode === 'pod' && selectedFilterId !== 'all') {
      list = list.filter((e) => e.pod_id === Number(selectedFilterId));
    } else if (viewMode === 'brand' && selectedFilterId !== 'all') {
      const targetBrandId = Number(selectedFilterId);
      list = list.filter((e) =>
        Object.values(e.days).some((d) => d.processes.some((p) => p.brand_id === targetBrandId))
      );
    } else if (viewMode === 'process' && selectedFilterId !== 'all') {
      const targetProcId = Number(selectedFilterId);
      list = list.filter((e) =>
        Object.values(e.days).some((d) => d.processes.some((p) => p.process_id === targetProcId))
      );
    }

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
    <div className="space-y-6 max-w-[1600px]">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">ROSTER MANAGEMENT</h2>
            <Badge variant="default" size="xs">
              CP-SAT Solver
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Assign shifts across {MONTH_NAMES[selectedMonth - 1]} {selectedYear} while respecting weekly caps, off-days, and brand minimums.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!generationResult}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateRoster}
            isLoading={isValidating}
            disabled={!generationResult}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
          >
            Validate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublishRoster}
            isLoading={isPublishing}
            disabled={!generationResult}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            Publish
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleGenerateRoster(true)}
            isLoading={isGenerating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Regenerate
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleGenerateRoster(false)}
            isLoading={isGenerating}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            Generate Roster
          </Button>
        </div>
      </div>

      {/* Ruled Period Readout Strip */}
      {generationResult ? (
        <div className="grid grid-cols-2 md:grid-cols-5 border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px] divide-y md:divide-y-0 md:divide-x divide-[#D9D4C7] tabular-nums">
          <div className="p-4">
            <span className="font-mono text-[11px] uppercase text-[#57534A]">Employees</span>
            <div className="text-xl font-bold font-mono text-[#1B1A17] mt-0.5">{generationResult.total_employees}</div>
          </div>
          <div className="p-4">
            <span className="font-mono text-[11px] uppercase text-[#57534A]">Staffing Slots</span>
            <div className="text-xl font-bold font-mono text-[#164B78] mt-0.5">
              {generationResult.total_assigned_staffing_slots} / {generationResult.total_required_staffing_slots}
            </div>
          </div>
          <div className="p-4">
            <span className="font-mono text-[11px] uppercase text-[#57534A]">Coverage</span>
            <div className="text-xl font-bold font-mono text-[#144836] mt-0.5">
              {generationResult.coverage_percentage}%
            </div>
          </div>
          <div className="p-4">
            <span className="font-mono text-[11px] uppercase text-[#57534A]">Shortages</span>
            <div
              className={`text-xl font-bold font-mono mt-0.5 ${
                generationResult.total_shortage_count > 0 ? 'text-[#784300]' : 'text-[#1B1A17]'
              }`}
            >
              {generationResult.total_shortage_count}
            </div>
          </div>
          <div className="p-4 col-span-2 md:col-span-1">
            <span className="font-mono text-[11px] uppercase text-[#57534A]">Solve Time</span>
            <div className="text-xl font-bold font-mono text-[#1B1A17] mt-0.5">
              {generationResult.optimization_statistics.wall_time_seconds.toFixed(2)}s
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[4px] border border-[#B8B1A1] bg-[#EDE8DC]">
          <div>
            <p className="text-sm font-semibold text-[#1B1A17]">
              No roster built yet for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
            <p className="text-xs text-[#57534A] mt-0.5">
              Run the constraint solver to populate daily shift assignments for every active staff member.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleGenerateRoster(false)}
            isLoading={isGenerating}
          >
            Generate Now
          </Button>
        </div>
      )}

      {/* Filter & View Mode Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FBF9F5] p-3 rounded-[4px] border border-[#D9D4C7]">
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-[#F6F3EC] rounded-[4px] border border-[#D9D4C7]">
          {(['company', 'pod', 'brand', 'process', 'employee'] as RosterViewMode[]).map((mode) => {
            const labels: Record<RosterViewMode, string> = {
              company: 'Company-Wide',
              pod: 'Pod-Wise',
              brand: 'Brand-Wise',
              process: 'Process-Wise',
              employee: 'Employee-Wise',
            };
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setViewMode(mode);
                  setSelectedFilterId('all');
                }}
                className={`px-3 py-1.5 rounded-[2px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active ? 'bg-[#164B78] text-[#FBF9F5]' : 'text-[#57534A] hover:text-[#1B1A17]'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'pod' && (
            <select
              value={selectedFilterId}
              onChange={(e) => setSelectedFilterId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-[#FBF9F5] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
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
              className="bg-[#FBF9F5] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
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
              className="bg-[#FBF9F5] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
            >
              <option value="all">All Processes ({processes.length})</option>
              {processes.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name} ({pr.code})
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="Search employee or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#FBF9F5] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17] placeholder-[#57534A]/70 w-48"
          />
        </div>
      </div>

      {/* Ruled Legend Strip */}
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-[#EDE8DC] rounded-[4px] border border-[#D9D4C7] text-xs text-[#57534A]">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1B1A17]">
          Key:
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-[#E5EFEA] text-[#144836] border border-[#8EB8A6]">
            ✓ W
          </span>
          <span>Working</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono bg-[#EDE8DC] text-[#57534A] border border-[#B8B1A1]">
            — OFF
          </span>
          <span>Weekly Off</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-[#FBF1DC] text-[#784300] border border-[#D9AD5B]">
            ▲ L
          </span>
          <span>Approved Leave</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC]">
            ◇ PH
          </span>
          <span>Public Holiday</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-[#E5EDF4] text-[#164B78] border border-[#8FB0CC]">
            ◆ CO
          </span>
          <span>Comp-Off</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-[#784300]" />
          <span>Pinned Cell</span>
        </span>
      </div>

      {/* Monthly Roster Matrix Sheet */}
      <div className="rounded-[4px] border border-[#B8B1A1] bg-[#FBF9F5] overflow-hidden">
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse tabular-nums">
            <thead className="sticky top-0 z-20 bg-[#EDE8DC] border-b border-[#B8B1A1] text-[#1B1A17]">
              <tr>
                <th className="sticky left-0 z-30 bg-[#EDE8DC] px-4 py-3 font-mono font-semibold uppercase tracking-wider text-[11px] min-w-[190px] border-r border-[#B8B1A1]">
                  Employee
                </th>
                <th className="px-3 py-3 font-mono font-semibold text-[11px] text-[#57534A] text-center min-w-[72px] border-r border-[#D9D4C7]">
                  Pod
                </th>
                <th className="px-2 py-3 font-mono font-semibold text-[11px] text-[#57534A] text-center min-w-[56px] border-r border-[#D9D4C7]">
                  Days
                </th>
                <th className="px-2 py-3 font-mono font-semibold text-[11px] text-[#57534A] text-center min-w-[60px] border-r border-[#B8B1A1]">
                  Hours
                </th>

                {daysInMonth.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`px-1.5 py-2 text-center min-w-[44px] border-r border-[#D9D4C7] select-none ${
                      d.isWeekend ? 'bg-[#E3DDD0] text-[#784300] font-semibold' : 'text-[#1B1A17]'
                    }`}
                  >
                    <div className="font-mono text-[10px] text-[#57534A] uppercase">{d.dayName}</div>
                    <div className="font-mono text-xs font-bold mt-0.5">{d.dayNum}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#D9D4C7]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth.length + 4} className="py-12 text-center text-[#57534A]">
                    {isGenerating
                      ? 'Building shift assignments...'
                      : 'No employees match the selected view filter or search query.'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                    <td className="sticky left-0 z-10 bg-[#FBF9F5] px-4 py-2 border-r border-[#B8B1A1]">
                      <div className="font-semibold text-[#1B1A17] truncate max-w-[165px]" title={emp.full_name}>
                        {emp.full_name}
                      </div>
                      <div className="text-[10px] text-[#57534A] font-mono">{emp.employee_code}</div>
                    </td>

                    <td className="px-3 py-2 text-center border-r border-[#D9D4C7] text-[#57534A] text-[11px] truncate max-w-[90px]">
                      {emp.pod_name || '—'}
                    </td>

                    <td className="px-2 py-2 text-center border-r border-[#D9D4C7] font-mono font-semibold text-[#1B1A17]">
                      {emp.total_working_days}d
                    </td>

                    <td className="px-2 py-2 text-center border-r border-[#B8B1A1] font-mono text-[#164B78] font-semibold">
                      {emp.total_hours.toFixed(0)}h
                    </td>

                    {daysInMonth.map((d) => {
                      const dayData = emp.days[d.dateStr];
                      const isLocked = !!lockedCells[`${emp.employee_id}_${d.dateStr}`];

                      if (!dayData) {
                        return (
                          <td
                            key={d.dateStr}
                            className="p-1 text-center border-r border-[#D9D4C7] text-[#57534A] font-mono"
                          >
                            —
                          </td>
                        );
                      }

                      let cellStyle = 'bg-[#F6F3EC] text-[#57534A] border-[#D9D4C7]';
                      let label = 'OFF';

                      if (dayData.is_working) {
                        cellStyle = 'bg-[#E5EFEA] text-[#144836] border-[#8EB8A6] font-semibold hover:bg-[#D5E7DE]';
                        label = 'W';
                      } else if (dayData.status.includes('LEAVE')) {
                        cellStyle = 'bg-[#FBF1DC] text-[#784300] border-[#D9AD5B] font-semibold';
                        label = 'L';
                      } else if (dayData.status.includes('HOLIDAY')) {
                        cellStyle = 'bg-[#E5EDF4] text-[#164B78] border-[#8FB0CC] font-semibold';
                        label = 'PH';
                      } else if (dayData.status.includes('COMP_OFF')) {
                        cellStyle = 'bg-[#E5EDF4] text-[#164B78] border-[#8FB0CC] font-semibold';
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
                          className="p-1 text-center border-r border-[#D9D4C7] cursor-pointer"
                        >
                          <div
                            className={`relative h-7 w-full rounded-[2px] flex items-center justify-center font-mono text-[11px] border ${cellStyle}`}
                            title={`${emp.full_name} on ${d.dateStr}: ${
                              dayData.is_working
                                ? `${dayData.shift || 'General'} - ${dayData.processes
                                    .map((p) => `${p.brand_name}: ${p.process_name}`)
                                    .join(', ')}`
                                : dayData.status
                            }`}
                          >
                            <span>{label}</span>
                            {isLocked && (
                              <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-[#784300]" />
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

      {/* Assignment Inspector Modal */}
      {selectedCell && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCell(null)}
          title="Shift Assignment Details"
          subtitle={`${selectedCell.employeeName} (${selectedCell.employeeCode}) · ${selectedCell.date}`}
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
                    <Unlock className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )
                }
              >
                {lockedCells[`${selectedCell.employeeId}_${selectedCell.date}`]
                  ? 'Unlock Cell'
                  : 'Lock Cell'}
              </Button>
              <Button size="sm" variant="primary" onClick={() => setSelectedCell(null)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-[4px] bg-[#F6F3EC] border border-[#D9D4C7]">
              <div>
                <span className="text-xs text-[#57534A]">Status</span>
                <p className="text-sm font-semibold text-[#1B1A17] mt-0.5">
                  {selectedCell.dayData.is_working ? 'Scheduled Shift' : selectedCell.dayData.status}
                </p>
              </div>
              <Badge variant={selectedCell.dayData.is_working ? 'WORKING' : 'WEEKLY_OFF'} dot>
                {selectedCell.dayData.is_working ? 'Working' : selectedCell.dayData.status}
              </Badge>
            </div>

            {selectedCell.dayData.is_working && (
              <>
                <div className="p-3 rounded-[4px] bg-[#F6F3EC] border border-[#D9D4C7]">
                  <span className="text-xs text-[#57534A]">Shift Window</span>
                  <p className="font-mono text-sm font-semibold text-[#1B1A17] mt-0.5">
                    {selectedCell.dayData.shift || 'General Shift'}
                  </p>
                </div>

                <div>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A] block mb-2">
                    Allocated Brands &amp; Processes
                  </span>
                  <div className="divide-y divide-[#D9D4C7] border border-[#D9D4C7] rounded-[4px] bg-[#FBF9F5]">
                    {selectedCell.dayData.processes.map((proc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-[#1B1A17]">{proc.brand_name}</p>
                          <p className="text-[#164B78] mt-0.5">{proc.process_name}</p>
                        </div>
                        <Badge variant="info" size="xs">
                          {proc.allocated_hours}h
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="p-3 rounded-[4px] bg-[#F6F3EC] border border-[#D9D4C7] text-xs text-[#57534A] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#164B78] shrink-0 mt-0.5" />
              <span>
                Locked assignments stay pinned when you click Regenerate.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
