import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';
import { brandService } from '../../services/brandService';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Brand, BrandProcess } from '../../types';

export const CoveragePage: React.FC = () => {
  const navigate = useNavigate();
  const { generationResult } = useRoster();
  const { showError } = useToast();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandProcesses, setBrandProcesses] = useState<BrandProcess[]>([]);
  const [filterBrandId, setFilterBrandId] = useState<number | 'all'>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bList, bpList] = await Promise.all([
          brandService.getAll(),
          brandService.getBrandProcesses(),
        ]);
        setBrands(bList);
        setBrandProcesses(bpList);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unable to load coverage rules';
        showError('Failed to load coverage data', message);
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
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">STAFFING COVERAGE ANALYSIS</h2>
          <p className="text-xs text-[#57534A] mt-1">
            Compare required minimum headcounts per brand calendar against assigned shifts.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => navigate('/roster')}>
          Run Roster Optimization
        </Button>
      </div>

      {/* Ruled Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px] divide-y md:divide-y-0 md:divide-x divide-[#D9D4C7] tabular-nums">
        <div className="p-4">
          <span className="font-mono text-[11px] uppercase text-[#57534A]">Demanded Slots</span>
          <div className="text-2xl font-bold font-mono text-[#1B1A17] mt-1">
            {generationResult ? generationResult.total_required_staffing_slots : '—'}
          </div>
          <p className="text-xs text-[#57534A] mt-0.5">From operating rules</p>
        </div>

        <div className="p-4">
          <span className="font-mono text-[11px] uppercase text-[#57534A]">Assigned Slots</span>
          <div className="text-2xl font-bold font-mono text-[#164B78] mt-1">
            {generationResult ? generationResult.total_assigned_staffing_slots : '—'}
          </div>
          <p className="text-xs text-[#57534A] mt-0.5">Filled in schedule</p>
        </div>

        <div className="p-4">
          <span className="font-mono text-[11px] uppercase text-[#57534A]">Coverage Rate</span>
          <div className="text-2xl font-bold font-mono text-[#144836] mt-1">
            {generationResult ? `${generationResult.coverage_percentage}%` : '—'}
          </div>
          <p className="text-xs text-[#57534A] mt-0.5">Current period</p>
        </div>

        <div className="p-4">
          <span className="font-mono text-[11px] uppercase text-[#57534A]">Shortages</span>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              shortages.length > 0 ? 'text-[#911D1D]' : 'text-[#144836]'
            }`}
          >
            {shortages.length}
          </div>
          <p className="text-xs text-[#57534A] mt-0.5">
            {shortages.length > 0 ? '✕ Slots short' : '✓ None unfilled'}
          </p>
        </div>
      </div>

      {/* Brand Process Requirements Table */}
      <section className="border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC]">
          <h3 className="text-sm font-semibold text-[#1B1A17]">
            Brand Process Minimum Headcounts ({brandProcesses.length})
          </h3>
          <p className="text-xs text-[#57534A]">
            Operating calendar rules checked during roster generation
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1B1A17] border-collapse tabular-nums">
            <thead className="border-b border-[#B8B1A1] bg-[#F6F3EC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
              <tr>
                <th className="px-4 py-3">Client Brand</th>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3">Operating Calendar</th>
                <th className="px-4 py-3 text-center">Min Staff / Shift</th>
                <th className="px-4 py-3 text-center">24/7</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {brandProcesses.map((bp) => (
                <tr key={bp.id} className="hover:bg-[#EDE8DC]/40">
                  <td className="px-4 py-3 font-semibold text-[#1B1A17]">
                    {bp.brand_name || `Brand #${bp.brand_id}`}
                  </td>
                  <td className="px-4 py-3 text-[#164B78] font-medium">
                    {bp.process_name || `Process #${bp.process_id}`}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#57534A]">{bp.operating_calendar}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-[#1B1A17]">
                    {bp.min_headcount_per_shift}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {bp.requires_24_7 ? (
                      <span className="text-[#784300] font-semibold">Yes</span>
                    ) : (
                      <span className="text-[#57534A]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={bp.is_active ? 'success' : 'default'} size="xs" dot>
                      {bp.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shortage Ledger */}
      <section className="border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC]">
          <div>
            <h3 className="text-sm font-semibold text-[#1B1A17]">Coverage Deficits</h3>
            <p className="text-xs text-[#57534A]">
              {shortages.length === 0
                ? 'No understaffed dates reported in the current roster.'
                : `${shortages.length} shift slot(s) below minimum staffing`}
            </p>
          </div>
          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-[#FBF9F5] border border-[#B8B1A1] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
          >
            <option value="all">All Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {shortages.length === 0 ? (
          <div className="p-4 flex items-center gap-3 bg-[#E5EFEA]/60 text-[#144836] text-xs">
            <span className="font-mono font-bold">✓</span>
            <span>All operating dates meet minimum headcount requirements.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1B1A17] border-collapse tabular-nums">
              <thead className="border-b border-[#B8B1A1] bg-[#F6F3EC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3">Process</th>
                  <th className="px-4 py-3 text-center">Required</th>
                  <th className="px-4 py-3 text-center">Assigned</th>
                  <th className="px-4 py-3 text-center">Gap</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {filteredShortages.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#EDE8DC]/40">
                    <td className="px-4 py-3 font-mono">{s.date}</td>
                    <td className="px-4 py-3 font-semibold">{s.brand_name}</td>
                    <td className="px-4 py-3 text-[#164B78]">{s.process_name}</td>
                    <td className="px-4 py-3 text-center font-mono">{s.required_headcount}</td>
                    <td className="px-4 py-3 text-center font-mono text-[#57534A]">{s.assigned_headcount}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-[#911D1D]">
                      △ -{s.missing_headcount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate('/assignments')}>
                        Assign Staff
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
