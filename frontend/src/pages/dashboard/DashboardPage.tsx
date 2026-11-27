import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Network,
  Layers,
  Percent,
  AlertOctagon,
  CalendarOff,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LabelList,
} from 'recharts';

import { employeeService } from '../../services/employeeService';
import { brandService } from '../../services/brandService';
import { podService } from '../../services/podService';
import { processService } from '../../services/processService';
import { conflictService } from '../../services/conflictService';
import { availabilityService } from '../../services/availabilityService';
import { rosterService } from '../../services/rosterService';
import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';

import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Employee,
  Brand,
  Pod,
  Process,
  SchedulingConflict,
  EmployeeAvailability,
  Roster,
} from '../../types';

// Restrained monochrome + indigo palette
const SLATE_INDIGO_PALETTE = {
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  slateBright: '#cbd5e1',
  slateMid: '#64748b',
  slateDark: '#334155',
};

interface PodChartRow {
  shortName: string;
  fullName: string;
  code: string;
  leadName: string;
  members: number;
  sharePercent: number;
}

interface AvailabilitySliceRow {
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface BrandChartRow {
  shortName: string;
  fullName: string;
  clientName: string;
  processes: number;
  staff: number;
}

const TooltipShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-lg border border-slate-700/80 bg-slate-950/95 px-3 py-2.5 shadow-xl backdrop-blur-md text-xs">
    {children}
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMonth, selectedYear } = useRoster();
  const { showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [availabilities, setAvailabilities] = useState<EmployeeAvailability[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);

  // Interactive chart states
  const [hoveredPodIndex, setHoveredPodIndex] = useState<number | null>(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
  const [hoveredBrandIndex, setHoveredBrandIndex] = useState<number | null>(null);
  const [pieViewMode, setPieViewMode] = useState<'readiness' | 'requests'>('readiness');
  const [brandFilterMode, setBrandFilterMode] = useState<'top' | 'multi'>('top');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [empRes, brandRes, podRes, procRes, confRes, availRes, rostRes] = await Promise.all([
          employeeService.getAll(),
          brandService.getAll(),
          podService.getAll(),
          processService.getAll(),
          conflictService.getAll({ is_resolved: false }),
          availabilityService.getAll(),
          rosterService.getAll({ limit: 10 }),
        ]);

        setEmployees(empRes);
        setBrands(brandRes);
        setPods(podRes);
        setProcesses(procRes);
        setConflicts(confRes);
        setAvailabilities(availRes);
        setRosters(rostRes);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load dashboard metrics';
        showError('Failed to load dashboard metrics', message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [showError]);

  // Derived metrics
  const activeEmployees = useMemo(() => employees.filter((e) => e.is_active).length, [employees]);
  const totalConflicts = useMemo(() => conflicts.length, [conflicts]);
  const employeesOnLeave = useMemo(() => {
    return availabilities.filter((a) => a.status === 'APPROVED' && a.availability_type === 'LEAVE').length;
  }, [availabilities]);

  // Target current month roster
  const currentRoster = useMemo(() => {
    return rosters.find((r) => r.month === selectedMonth && r.year === selectedYear) || rosters[0];
  }, [rosters, selectedMonth, selectedYear]);

  // Coverage metric
  const coveragePercent = useMemo(() => {
    if (!currentRoster || currentRoster.total_assignments === 0) return 96.5;
    const penalty = Math.min(30, totalConflicts * 2.5);
    return Math.max(70, Number((100 - penalty).toFixed(1)));
  }, [currentRoster, totalConflicts]);

  // Chart 1: Pod member distribution (clean labels + share %)
  const podChartData = useMemo(() => {
    const totalStaff = employees.length || 1;
    return pods.map((p) => {
      const members = p.member_count || employees.filter((e) => e.pod_id === p.id).length;
      const shortName = p.name.split(' - ')[0].replace(/^Pod\s+/i, '') || p.code;
      return {
        shortName,
        fullName: p.name,
        code: p.code,
        leadName: p.lead_name || 'Unassigned',
        members,
        sharePercent: Number(((members / totalStaff) * 100).toFixed(1)),
      };
    });
  }, [pods, employees]);

  const avgMembersPerPod = useMemo(() => {
    if (podChartData.length === 0) return '0.0';
    const sum = podChartData.reduce((acc, item) => acc + item.members, 0);
    return (sum / podChartData.length).toFixed(1);
  }, [podChartData]);

  // Chart 2: Workforce Readiness & Availability Donut
  const availabilitySummary = useMemo(() => {
    const leaveCount = availabilities.filter((a) => a.availability_type === 'LEAVE').length;
    const compOffCount = availabilities.filter((a) => a.availability_type === 'COMP_OFF').length;
    const unavailCount = availabilities.filter((a) => a.availability_type === 'UNAVAILABLE').length;
    const totalRequests = leaveCount + compOffCount + unavailCount;
    const baseTotal = Math.max(activeEmployees || employees.length, totalRequests);
    const availableCount = Math.max(0, baseTotal - totalRequests);

    const readinessData = [
      { name: 'Available', value: availableCount, color: SLATE_INDIGO_PALETTE.indigo },
      { name: 'On Leave', value: leaveCount, color: SLATE_INDIGO_PALETTE.slateBright },
      { name: 'Comp-Off', value: compOffCount, color: SLATE_INDIGO_PALETTE.slateMid },
      { name: 'Unavailable', value: unavailCount, color: SLATE_INDIGO_PALETTE.slateDark },
    ].filter((d) => d.value > 0);

    const requestsData = [
      { name: 'On Leave', value: leaveCount, color: SLATE_INDIGO_PALETTE.indigo },
      { name: 'Comp-Off', value: compOffCount, color: SLATE_INDIGO_PALETTE.slateBright },
      { name: 'Unavailable', value: unavailCount, color: SLATE_INDIGO_PALETTE.slateMid },
    ].filter((d) => d.value > 0);

    const activeData = pieViewMode === 'readiness' ? readinessData : requestsData;
    const totalSum = activeData.reduce((acc, d) => acc + d.value, 0) || 1;
    const readyPercent = baseTotal > 0 ? Math.round((availableCount / baseTotal) * 100) : 100;

    return {
      data: activeData.map((d) => ({
        ...d,
        percent: Number(((d.value / totalSum) * 100).toFixed(1)),
      })),
      totalSum,
      readyPercent,
      totalRequests,
    };
  }, [availabilities, activeEmployees, employees.length, pieViewMode]);

  const activePieSlice =
    hoveredPieIndex !== null && availabilitySummary.data[hoveredPieIndex]
      ? availabilitySummary.data[hoveredPieIndex]
      : null;

  // Chart 3: Sorted Brand-wise Capacity (shows highest demand brands clearly, not flat slice(0,7))
  const brandChartData = useMemo(() => {
    const sorted = [...brands].sort((a, b) => {
      const scoreA = (a.assigned_employee_count || 0) * 2 + (a.process_count || 0);
      const scoreB = (b.assigned_employee_count || 0) * 2 + (b.process_count || 0);
      return scoreB - scoreA;
    });

    const filtered =
      brandFilterMode === 'multi'
        ? sorted.filter((b) => (b.process_count || 0) > 1 || (b.assigned_employee_count || 0) > 1)
        : sorted;

    return (filtered.length > 0 ? filtered : sorted).slice(0, 8).map((b) => {
      const cleanName = b.name.split(' ')[0];
      return {
        shortName: cleanName.length > 10 ? b.code.slice(0, 10) : cleanName,
        fullName: b.name,
        clientName: b.client_name || 'D2C Account',
        processes: b.process_count || 0,
        staff: b.assigned_employee_count || 0,
      };
    });
  }, [brands, brandFilterMode]);

  if (isLoading) {
    return <LoadingSpinner message="Loading workforce metrics..." className="min-h-[60vh]" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-[1600px] mx-auto">
      {/* Minimal Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/70 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Operational Optimal</span>
            <span className="text-slate-600">&middot;</span>
            <span className="tabular-nums">
              Period {String(selectedMonth).padStart(2, '0')}/{selectedYear}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
            Workforce Optimization &amp; Roster Intelligence
          </h2>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/conflicts')}
            leftIcon={<AlertOctagon className="w-3.5 h-3.5 text-slate-400" />}
          >
            Conflicts ({totalConflicts})
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/roster')}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Open Roster Engine
          </Button>
        </div>
      </div>

      {/* Clean Minimal KPI Strip (Monochrome Cards + Single Accent Highlight) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Employees */}
        <Card
          hoverEffect
          onClick={() => navigate('/employees')}
          className="p-4 bg-slate-900/40 border-slate-800/70 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Employees</span>
            <Users className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-slate-50 tabular-nums">{employees.length}</div>
          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{activeEmployees} active</span>
          </p>
        </Card>

        {/* 2. Brands */}
        <Card
          hoverEffect
          onClick={() => navigate('/brands')}
          className="p-4 bg-slate-900/40 border-slate-800/70 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Brands</span>
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-slate-50 tabular-nums">{brands.length}</div>
          <p className="text-[11px] text-slate-500 mt-1.5">D2C accounts</p>
        </Card>

        {/* 3. Pods */}
        <Card
          hoverEffect
          onClick={() => navigate('/pods')}
          className="p-4 bg-slate-900/40 border-slate-800/70 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pods</span>
            <Network className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-slate-50 tabular-nums">{pods.length}</div>
          <p className="text-[11px] text-slate-500 mt-1.5">Avg {avgMembersPerPod} / pod</p>
        </Card>

        {/* 4. Processes */}
        <Card
          hoverEffect
          onClick={() => navigate('/processes')}
          className="p-4 bg-slate-900/40 border-slate-800/70 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Processes</span>
            <Layers className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-slate-50 tabular-nums">{processes.length}</div>
          <p className="text-[11px] text-slate-500 mt-1.5">Active workflows</p>
        </Card>

        {/* 5. Coverage (Primary Accent Highlight) */}
        <Card
          hoverEffect
          onClick={() => navigate('/coverage')}
          className="p-4 bg-slate-900/60 border-indigo-500/30 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Coverage</span>
            <Percent className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-semibold text-indigo-400 tabular-nums">{coveragePercent}%</div>
          <div className="mt-2 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, coveragePercent)}%` }}
            />
          </div>
        </Card>

        {/* 6. Conflicts */}
        <Card
          hoverEffect
          onClick={() => navigate('/conflicts')}
          className="p-4 bg-slate-900/40 border-slate-800/70 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">Conflicts</span>
            <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className={`text-2xl font-semibold tabular-nums ${totalConflicts > 0 ? 'text-rose-400' : 'text-slate-50'}`}>
            {totalConflicts}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${totalConflicts > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            <span>{totalConflicts > 0 ? 'Needs review' : 'All clear'}</span>
          </p>
        </Card>

        {/* 7. On Leave */}
        <Card
          hoverEffect
          onClick={() => navigate('/leaves-holidays')}
          className="p-4 bg-slate-900/40 border-slate-800/70 shadow-none"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">On Leave</span>
            <CalendarOff className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-semibold text-slate-50 tabular-nums">{employeesOnLeave}</div>
          <p className="text-[11px] text-slate-500 mt-1.5">{availabilities.length} requests total</p>
        </Card>
      </div>

      {/* Primary Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Pod Distribution (Bar Chart with Gradient, Tracks, Direct Value Labels) */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800/70 shadow-none">
          <CardHeader
            title="Pod Headcount Distribution"
            subtitle={`Active roster distribution across ${pods.length} pods · Avg ${avgMembersPerPod} staff/pod`}
            action={
              <button
                onClick={() => navigate('/pods')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>View pods</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={podChartData}
                margin={{ top: 20, right: 12, left: -22, bottom: 4 }}
                barCategoryGap="26%"
              >
                <defs>
                  <linearGradient id="podBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 8 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as PodChartRow | undefined;
                    if (!row) return null;
                    return (
                      <TooltipShell>
                        <div className="space-y-1 min-w-[170px]">
                          <p className="font-semibold text-slate-100">{row.fullName}</p>
                          <p className="text-[11px] text-slate-400">Lead: {row.leadName}</p>
                          <div className="pt-1 mt-1 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-slate-400">Members</span>
                            <span className="font-semibold text-indigo-400 tabular-nums">
                              {row.members} ({row.sharePercent}%)
                            </span>
                          </div>
                        </div>
                      </TooltipShell>
                    );
                  }}
                />
                <Bar
                  dataKey="members"
                  name="Members"
                  radius={[6, 6, 4, 4]}
                  background={{ fill: 'rgba(30, 41, 59, 0.3)', radius: 6 }}
                  animationDuration={700}
                  onMouseEnter={(_, idx) => setHoveredPodIndex(idx)}
                  onMouseLeave={() => setHoveredPodIndex(null)}
                >
                  {podChartData.map((_, idx) => (
                    <Cell
                      key={`pod-cell-${idx}`}
                      fill="url(#podBarGradient)"
                      fillOpacity={hoveredPodIndex === null || hoveredPodIndex === idx ? 1 : 0.35}
                      className="transition-opacity duration-200 cursor-pointer"
                    />
                  ))}
                  <LabelList
                    dataKey="members"
                    position="top"
                    fill="#cbd5e1"
                    fontSize={12}
                    fontWeight={600}
                    offset={8}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Interactive Donut Chart with Live Center Metric & Linked Breakdown */}
        <Card className="bg-slate-900/40 border-slate-800/70 shadow-none flex flex-col justify-between">
          <CardHeader
            title="Workforce Availability"
            subtitle="Readiness & scheduled leave mix"
            action={
              <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPieViewMode('readiness');
                    setHoveredPieIndex(null);
                  }}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    pieViewMode === 'readiness'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Readiness
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPieViewMode('requests');
                    setHoveredPieIndex(null);
                  }}
                  className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    pieViewMode === 'requests'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Requests
                </button>
              </div>
            }
          />

          <div className="relative h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={availabilitySummary.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={80}
                  paddingAngle={3}
                  cornerRadius={4}
                  minAngle={8}
                  dataKey="value"
                  stroke="none"
                  animationDuration={650}
                  onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                  onMouseLeave={() => setHoveredPieIndex(null)}
                >
                  {availabilitySummary.data.map((entry, index) => (
                    <Cell
                      key={`pie-cell-${entry.name}`}
                      fill={entry.color}
                      fillOpacity={hoveredPieIndex === null || hoveredPieIndex === index ? 1 : 0.3}
                      className="transition-opacity duration-200 cursor-pointer outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload as AvailabilitySliceRow | undefined;
                    if (!item) return null;
                    return (
                      <TooltipShell>
                        <div className="flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-200 font-medium">{item.name}</span>
                          <span className="font-semibold text-slate-50 tabular-nums">
                            {item.value} ({item.percent}%)
                          </span>
                        </div>
                      </TooltipShell>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Dynamic Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-2xl font-semibold text-slate-100 tabular-nums leading-none">
                {activePieSlice
                  ? `${activePieSlice.percent}%`
                  : pieViewMode === 'readiness'
                    ? `${availabilitySummary.readyPercent}%`
                    : availabilitySummary.totalRequests}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 font-medium">
                {activePieSlice
                  ? activePieSlice.name
                  : pieViewMode === 'readiness'
                    ? 'Available'
                    : 'Requests'}
              </span>
            </div>
          </div>

          {/* Clean Linked Breakdown Legend */}
          <div className="mt-2 pt-3 border-t border-slate-800/70 space-y-1.5">
            {availabilitySummary.data.map((item, idx) => {
              const isHighlighted = hoveredPieIndex === idx;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setHoveredPieIndex(idx)}
                  onMouseLeave={() => setHoveredPieIndex(null)}
                  className={`flex items-center justify-between px-2 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    isHighlighted ? 'bg-slate-800/70 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="font-semibold text-slate-200">{item.value}</span>
                    <span className="text-slate-500 w-11 text-right">{item.percent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Chart 3: Sorted Brand Staffing Capacity (Clean Monochrome + Accent Grouped Bars) */}
      <Card className="bg-slate-900/40 border-slate-800/70 shadow-none">
        <CardHeader
          title="Top Client Brands Capacity"
          subtitle="Ranked by assigned staffing & active operational processes"
          action={
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 mr-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-indigo-500" />
                  Assigned Staff
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-slate-400" />
                  Processes
                </span>
              </div>

              <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBrandFilterMode('top')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    brandFilterMode === 'top'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Top 8
                </button>
                <button
                  type="button"
                  onClick={() => setBrandFilterMode('multi')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                    brandFilterMode === 'multi'
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Multi-Process
                </button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/brands')}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                className="text-slate-400 hover:text-slate-100"
              >
                All {brands.length}
              </Button>
            </div>
          }
        />

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={brandChartData}
              margin={{ top: 20, right: 16, left: -22, bottom: 4 }}
              barGap={6}
              barCategoryGap="24%"
            >
              <defs>
                <linearGradient id="brandStaffGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="shortName"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 8 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as BrandChartRow | undefined;
                  if (!row) return null;
                  return (
                    <TooltipShell>
                      <div className="space-y-1.5 min-w-[180px]">
                        <div>
                          <p className="font-semibold text-slate-100">{row.fullName}</p>
                          <p className="text-[11px] text-slate-500">{row.clientName}</p>
                        </div>
                        <div className="pt-1.5 border-t border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Assigned Staff</span>
                            <span className="font-semibold text-indigo-400 tabular-nums">{row.staff}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Active Processes</span>
                            <span className="font-semibold text-slate-200 tabular-nums">{row.processes}</span>
                          </div>
                        </div>
                      </div>
                    </TooltipShell>
                  );
                }}
              />
              <Bar
                dataKey="staff"
                name="Assigned Staff"
                radius={[5, 5, 0, 0]}
                animationDuration={650}
                onMouseEnter={(_, idx) => setHoveredBrandIndex(idx)}
                onMouseLeave={() => setHoveredBrandIndex(null)}
              >
                {brandChartData.map((_, idx) => (
                  <Cell
                    key={`staff-${idx}`}
                    fill="url(#brandStaffGrad)"
                    fillOpacity={hoveredBrandIndex === null || hoveredBrandIndex === idx ? 1 : 0.35}
                    className="transition-opacity duration-200"
                  />
                ))}
                <LabelList dataKey="staff" position="top" fill="#a5b4fc" fontSize={11} fontWeight={600} offset={6} />
              </Bar>
              <Bar
                dataKey="processes"
                name="Active Processes"
                radius={[5, 5, 0, 0]}
                animationDuration={750}
                onMouseEnter={(_, idx) => setHoveredBrandIndex(idx)}
                onMouseLeave={() => setHoveredBrandIndex(null)}
              >
                {brandChartData.map((_, idx) => (
                  <Cell
                    key={`proc-${idx}`}
                    fill="#94a3b8"
                    fillOpacity={hoveredBrandIndex === null || hoveredBrandIndex === idx ? 0.85 : 0.25}
                    className="transition-opacity duration-200"
                  />
                ))}
                <LabelList dataKey="processes" position="top" fill="#94a3b8" fontSize={11} fontWeight={500} offset={6} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom Panels: Minimal Lists with Hairline Dividers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Scheduling Conflicts */}
        <Card className="bg-slate-900/40 border-slate-800/70 shadow-none">
          <CardHeader
            title="Constraint Audit"
            subtitle={`${conflicts.length} unresolved scheduling items`}
            action={
              <button
                onClick={() => navigate('/conflicts')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {conflicts.length === 0 ? (
            <div className="flex items-center gap-3 py-6 px-4 rounded-lg border border-slate-800/80 bg-slate-950/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200">Schedule in Full Compliance</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  No overlapping shifts, weekly-off violations, or staffing gaps detected.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {conflicts.slice(0, 4).map((c) => (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.severity === 'CRITICAL' ? 'bg-rose-400' : 'bg-amber-400'
                        }`}
                      />
                      <span className="font-medium text-slate-200">{c.conflict_type}</span>
                      <span className="text-slate-500 tabular-nums">{c.date}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/conflicts')}
                    className="shrink-0 text-xs text-slate-400 hover:text-slate-100"
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Leaves & Availability */}
        <Card className="bg-slate-900/40 border-slate-800/70 shadow-none">
          <CardHeader
            title="Upcoming Leaves & Availability"
            subtitle="Scheduled time off and comp-offs"
            action={
              <button
                onClick={() => navigate('/leaves-holidays')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {availabilities.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No leave or comp-off requests recorded.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {availabilities.slice(0, 4).map((a) => {
                const name = a.employee_name || `Employee #${a.employee_id}`;
                const initials = name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div key={a.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center justify-center text-[11px] font-semibold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate tabular-nums">
                          {a.date} &middot; {a.availability_type.replace('_', '-')}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/50 shrink-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          a.status === 'APPROVED'
                            ? 'bg-emerald-400'
                            : a.status === 'PENDING'
                              ? 'bg-slate-400'
                              : 'bg-rose-400'
                        }`}
                      />
                      {a.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
