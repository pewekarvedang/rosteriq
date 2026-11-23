import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ShieldCheck,
  RefreshCw,
  Search,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { conflictService } from '../../services/conflictService';
import { rosterService } from '../../services/rosterService';
import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';

import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SchedulingConflict } from '../../types';

export const ConflictsPage: React.FC = () => {
  const navigate = useNavigate();
  const { generationResult } = useRoster();
  const { showSuccess, showError, showInfo } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const loadConflicts = async () => {
    setIsLoading(true);
    try {
      const data = await conflictService.getAll();
      setConflicts(data);
    } catch (err: any) {
      showError('Failed to load conflicts', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  const handleToggleResolve = async (conflict: SchedulingConflict) => {
    try {
      const updated = await conflictService.resolve(conflict.id, !conflict.is_resolved);
      setConflicts((prev) => prev.map((c) => (c.id === conflict.id ? updated : c)));
      showSuccess(
        updated.is_resolved ? 'Conflict Marked Resolved' : 'Conflict Re-opened',
        `Violation #${conflict.id} is now ${updated.is_resolved ? 'resolved' : 'active'}.`
      );
    } catch (err: any) {
      showError('Error updating conflict', err.message);
    }
  };

  const handleTriggerRevalidation = async () => {
    if (!generationResult?.roster_id) {
      showInfo('Revalidation Notice', 'Please load or generate an active roster to revalidate.');
      return;
    }
    setIsValidating(true);
    try {
      const res = await rosterService.validate(generationResult.roster_id);
      await loadConflicts();
      if (res.is_valid) {
        showSuccess('Roster In Full Compliance', 'All hard constraints successfully satisfied.');
      } else {
        showInfo('Revalidation Audit Complete', `Detected ${res.total_conflicts} remaining violation(s).`);
      }
    } catch (err: any) {
      showError('Revalidation failed', err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      // Resolved filter
      if (resolvedFilter === 'unresolved' && c.is_resolved) return false;
      if (resolvedFilter === 'resolved' && !c.is_resolved) return false;

      // Severity filter
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = c.description.toLowerCase().includes(q);
        const matchesType = c.conflict_type.toLowerCase().includes(q);
        const matchesEmp = c.employee_name?.toLowerCase().includes(q);
        const matchesBrand = c.brand_name?.toLowerCase().includes(q);
        return matchesDesc || matchesType || matchesEmp || matchesBrand;
      }

      return true;
    });
  }, [conflicts, resolvedFilter, severityFilter, searchQuery]);

  const criticalCount = useMemo(() => conflicts.filter((c) => !c.is_resolved && c.severity === 'CRITICAL').length, [conflicts]);
  const warningCount = useMemo(() => conflicts.filter((c) => !c.is_resolved && c.severity === 'WARNING').length, [conflicts]);
  const infoCount = useMemo(() => conflicts.filter((c) => !c.is_resolved && c.severity === 'INFO').length, [conflicts]);

  if (isLoading) {
    return <LoadingSpinner message="Auditing roster violations & constraint logs..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">SCHEDULING CONFLICTS CENTER</h2>
            <Badge variant={criticalCount > 0 ? 'CRITICAL' : 'success'} size="xs">
              {criticalCount > 0 ? `${criticalCount} Critical` : 'No Critical'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic rule violation log, weekly-off audits, leave clashes & solver diagnosis
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConflicts}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-400" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerRevalidation}
            isLoading={isValidating}
            leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
          >
            Trigger Revalidation
          </Button>
        </div>
      </div>

      {/* Severity Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card
          hoverEffect
          onClick={() => { setResolvedFilter('unresolved'); setSeverityFilter('CRITICAL'); }}
          className="p-4 border-rose-900/40 bg-slate-900/60"
        >
          <span className="text-xs font-semibold uppercase text-rose-400">Critical Violations</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{criticalCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Overlapping shifts & unapproved work</p>
        </Card>

        <Card
          hoverEffect
          onClick={() => { setResolvedFilter('unresolved'); setSeverityFilter('WARNING'); }}
          className="p-4 border-amber-900/40 bg-slate-900/60"
        >
          <span className="text-xs font-semibold uppercase text-amber-400">Warnings</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{warningCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Hours thresholds & preferred offs</p>
        </Card>

        <Card
          hoverEffect
          onClick={() => { setResolvedFilter('unresolved'); setSeverityFilter('INFO'); }}
          className="p-4 border-sky-900/40 bg-slate-900/60"
        >
          <span className="text-xs font-semibold uppercase text-sky-400">Information</span>
          <div className="text-2xl font-bold text-sky-400 mt-1">{infoCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Operating calendar exceptions</p>
        </Card>

        <Card
          hoverEffect
          onClick={() => { setResolvedFilter('resolved'); setSeverityFilter('all'); }}
          className="p-4 border-emerald-900/40 bg-slate-900/60"
        >
          <span className="text-xs font-semibold uppercase text-emerald-400">Resolved Audit Items</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {conflicts.filter((c) => c.is_resolved).length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Resolved by manual overrides</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setResolvedFilter('unresolved')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                resolvedFilter === 'unresolved' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active ({conflicts.filter((c) => !c.is_resolved).length})
            </button>
            <button
              onClick={() => setResolvedFilter('resolved')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                resolvedFilter === 'resolved' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Resolved ({conflicts.filter((c) => c.is_resolved).length})
            </button>
            <button
              onClick={() => setResolvedFilter('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                resolvedFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({conflicts.length})
            </button>
          </div>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search description, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
          />
        </div>
      </div>

      {/* Conflicts List */}
      <Card>
        {filteredConflicts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-300">No conflicts match your filter criteria.</p>
            <p className="text-xs text-slate-500 mt-1">The workforce schedule is currently free of these issues.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredConflicts.map((c) => (
              <div
                key={c.id}
                className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={c.severity} size="xs">
                      {c.severity}
                    </Badge>
                    <span className="font-bold text-slate-200 text-sm">{c.conflict_type}</span>
                    <span className="text-xs font-mono text-slate-400">&bull; {c.date}</span>
                    {c.employee_name && (
                      <span className="text-xs font-semibold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {c.employee_name}
                      </span>
                    )}
                    {c.brand_name && (
                      <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {c.brand_name}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>

                  {c.resolution_suggestion && (
                    <div className="text-xs text-emerald-400/90 flex items-center gap-1.5 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/30">
                      <span className="font-semibold text-emerald-300">Recommended Resolution:</span>
                      <span>{c.resolution_suggestion}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={c.is_resolved ? 'outline' : 'secondary'}
                    onClick={() => handleToggleResolve(c)}
                    leftIcon={c.is_resolved ? <X className="w-3.5 h-3.5 text-slate-400" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  >
                    {c.is_resolved ? 'Re-open' : 'Mark Resolved'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
