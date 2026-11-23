import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';
import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';
import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Brand, Process, BrandProcess } from '../../types';

export const CoveragePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMonth, selectedYear, generationResult, isGenerating } = useRoster();
  const { showError } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [brandProcesses, setBrandProcesses] = useState<BrandProcess[]>([]);
  const [filterBrandId, setFilterBrandId] = useState<number | 'all'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bList, pList, bpList] = await Promise.all([
          brandService.getAll(),
          processService.getAll(),
          brandService.getBrandProcesses(),
        ]);
        setBrands(bList);
        setProcesses(pList);
        setBrandProcesses(bpList);
      } catch (err: any) {
        showError('Failed to load coverage data', err.message);
      }
    };
    loadData();
  }, [showError]);

  const shortages = generationResult?.shortage_details || [];

  const filteredShortages = useMemo(() => {
    if (filterBrandId === 'all') return shortages;
    return shortages.filter((s) => s.brand_id === Number(filterBrandId));
  }, [shortages, filterBrandId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">STAFFING COVERAGE ANALYSIS</h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit demanded staffing headcount against actual deterministic assignments across all brand processes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/roster')}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Run Roster Optimization
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Demanded Slots</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {generationResult ? generationResult.total_required_staffing_slots : '--'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Calculated from calendar rules</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Assigned Headcount Slots</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {generationResult ? generationResult.total_assigned_staffing_slots : '--'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Distinct employee assignments</p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Coverage Percentage</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {generationResult ? `${generationResult.coverage_percentage}%` : '--'}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-0.5 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            Operational SLA Target: 95%
          </p>
        </Card>

        <Card className="p-4 bg-slate-900/60 border-slate-800">
          <span className="text-xs font-semibold uppercase text-slate-400">Coverage Shortages</span>
          <div
            className={`text-2xl font-bold mt-1 ${
              shortages.length > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {shortages.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {shortages.length > 0 ? 'Action required' : 'Full capacity achieved'}
          </p>
        </Card>
      </div>

      {/* Brand Processes Staffing Standards */}
      <Card>
        <CardHeader
          title="Configured Brand Process Minimum Headcounts"
          subtitle="Operating rules and mandatory headcounts enforced by CP-SAT solver"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Client Brand</th>
                <th className="px-4 py-3">Business Process</th>
                <th className="px-4 py-3">Operating Rule</th>
                <th className="px-4 py-3 text-center">Min Staff / Shift</th>
                <th className="px-4 py-3 text-center">24/7 Demand</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {brandProcesses.map((bp) => (
                <tr key={bp.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {bp.brand_name || `Brand #${bp.brand_id}`}
                  </td>
                  <td className="px-4 py-3 text-indigo-400 font-medium">
                    {bp.process_name || `Process #${bp.process_id}`}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">{bp.operating_calendar}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-100">
                    {bp.min_headcount_per_shift} staff
                  </td>
                  <td className="px-4 py-3 text-center">
                    {bp.requires_24_7 ? (
                      <span className="text-amber-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={bp.is_active ? 'success' : 'default'} size="xs">
                      {bp.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Shortage Details Table */}
      <Card>
        <CardHeader
          title="Understaffed Dates & Coverage Deficits"
          subtitle={
            shortages.length === 0
              ? 'Zero staffing shortages recorded for this roster run'
              : `${shortages.length} slot(s) experiencing capacity shortfall`
          }
          action={
            <select
              value={filterBrandId}
              onChange={(e) => setFilterBrandId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          }
        />

        {shortages.length === 0 ? (
          <div className="flex items-center gap-3 p-6 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-400">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">100% Demand Satisfaction</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Every operating calendar requirement for all brand processes has sufficient assigned headcount.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Process</th>
                  <th className="px-4 py-3 text-center">Required</th>
                  <th className="px-4 py-3 text-center">Assigned</th>
                  <th className="px-4 py-3 text-center">Deficit</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredShortages.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono text-slate-300">{s.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{s.brand_name}</td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">{s.process_name}</td>
                    <td className="px-4 py-3 text-center text-slate-200">{s.required_headcount}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{s.assigned_headcount}</td>
                    <td className="px-4 py-3 text-center font-bold text-rose-400">
                      -{s.missing_headcount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate('/assignments')}
                        className="text-xs py-1 px-2"
                      >
                        Assign Employees
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
