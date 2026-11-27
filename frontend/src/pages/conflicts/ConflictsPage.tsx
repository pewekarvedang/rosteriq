import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ShieldCheck, Search, Check, X } from 'lucide-react';
import { conflictService } from '../../services/conflictService';
import { rosterService } from '../../services/rosterService';
import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';

import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { SchedulingConflict } from '../../types';

export const ConflictsPage: React.FC = () => {
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch conflicts';
      showError('Failed to load conflicts', message);
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
        updated.is_resolved ? 'Conflict Resolved' : 'Conflict Re-opened',
        `Entry #${conflict.id} marked ${updated.is_resolved ? 'resolved' : 'active'}.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      showError('Error updating conflict', message);
    }
  };

  const handleTriggerRevalidation = async () => {
    if (!generationResult?.roster_id) {
      showInfo('Validation Notice', 'Generate or load a roster first to run revalidation.');
      return;
    }
    setIsValidating(true);
    try {
      const res = await rosterService.validate(generationResult.roster_id);
      await loadConflicts();
      if (res.is_valid) {
        showSuccess('Schedule Valid', 'All constraints pass with zero open clashes.');
      } else {
        showInfo('Audit Complete', `Detected ${res.total_conflicts} conflict(s).`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Revalidation failed';
      showError('Revalidation failed', message);
    } finally {
      setIsValidating(false);
    }
  };

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (resolvedFilter === 'unresolved' && c.is_resolved) return false;
      if (resolvedFilter === 'resolved' && !c.is_resolved) return false;
      if (severityFilter !== 'all' && c.severity !== severityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.description.toLowerCase().includes(q) ||
          c.conflict_type.toLowerCase().includes(q) ||
          Boolean(c.employee_name?.toLowerCase().includes(q)) ||
          Boolean(c.brand_name?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [conflicts, resolvedFilter, severityFilter, searchQuery]);

  const criticalCount = useMemo(
    () => conflicts.filter((c) => !c.is_resolved && c.severity === 'CRITICAL').length,
    [conflicts]
  );
  const warningCount = useMemo(
    () => conflicts.filter((c) => !c.is_resolved && c.severity === 'WARNING').length,
    [conflicts]
  );
  const infoCount = useMemo(
    () => conflicts.filter((c) => !c.is_resolved && c.severity === 'INFO').length,
    [conflicts]
  );

  if (isLoading) {
    return <LoadingSpinner message="Checking schedule conflicts..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">SCHEDULING CONFLICTS CENTER</h2>
            <Badge variant={criticalCount > 0 ? 'CRITICAL' : 'success'} size="xs" dot>
              {criticalCount > 0 ? `${criticalCount} Critical` : '0 Critical'}
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Audit overlapping shifts, weekly-off misses, and leave overlaps before publishing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConflicts}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
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

      {/* Ruled Severity Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px] divide-y sm:divide-y-0 sm:divide-x divide-[#D9D4C7] tabular-nums">
        <button
          type="button"
          onClick={() => {
            setResolvedFilter('unresolved');
            setSeverityFilter('CRITICAL');
          }}
          className="p-4 text-left hover:bg-[#EDE8DC]/60 cursor-pointer"
        >
          <span className="font-mono text-[11px] font-semibold uppercase text-[#911D1D]">✕ Critical</span>
          <div className="text-2xl font-bold font-mono text-[#911D1D] mt-1">{criticalCount}</div>
          <p className="text-xs text-[#57534A]">Overlaps &amp; leave breaches</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setResolvedFilter('unresolved');
            setSeverityFilter('WARNING');
          }}
          className="p-4 text-left hover:bg-[#EDE8DC]/60 cursor-pointer"
        >
          <span className="font-mono text-[11px] font-semibold uppercase text-[#784300]">△ Warnings</span>
          <div className="text-2xl font-bold font-mono text-[#784300] mt-1">{warningCount}</div>
          <p className="text-xs text-[#57534A]">Hour caps &amp; preferred offs</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setResolvedFilter('unresolved');
            setSeverityFilter('INFO');
          }}
          className="p-4 text-left hover:bg-[#EDE8DC]/60 cursor-pointer"
        >
          <span className="font-mono text-[11px] font-semibold uppercase text-[#164B78]">◆ Notices</span>
          <div className="text-2xl font-bold font-mono text-[#164B78] mt-1">{infoCount}</div>
          <p className="text-xs text-[#57534A]">Calendar exceptions</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setResolvedFilter('resolved');
            setSeverityFilter('all');
          }}
          className="p-4 text-left hover:bg-[#EDE8DC]/60 cursor-pointer"
        >
          <span className="font-mono text-[11px] font-semibold uppercase text-[#144836]">✓ Resolved</span>
          <div className="text-2xl font-bold font-mono text-[#144836] mt-1">
            {conflicts.filter((c) => c.is_resolved).length}
          </div>
          <p className="text-xs text-[#57534A]">Signed off entries</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FBF9F5] p-3 rounded-[4px] border border-[#D9D4C7]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-[#F6F3EC] p-0.5 rounded-[4px] border border-[#D9D4C7] text-xs">
            {(['unresolved', 'resolved', 'all'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setResolvedFilter(status)}
                className={`px-3 py-1 rounded-[2px] font-medium cursor-pointer ${
                  resolvedFilter === status ? 'bg-[#164B78] text-[#FBF9F5]' : 'text-[#57534A] hover:text-[#1B1A17]'
                }`}
              >
                {status === 'unresolved'
                  ? `Active (${conflicts.filter((c) => !c.is_resolved).length})`
                  : status === 'resolved'
                    ? `Resolved (${conflicts.filter((c) => c.is_resolved).length})`
                    : `All (${conflicts.length})`}
              </button>
            ))}
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#FBF9F5] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#57534A] absolute left-3 top-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#FBF9F5] border border-[#D9D4C7] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#1B1A17] placeholder-[#57534A]/70 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Conflict Log */}
      <div className="border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px]">
        {filteredConflicts.length === 0 ? (
          <div className="p-8 text-left border-l-4 border-[#144836] bg-[#E5EFEA]/40">
            <p className="text-sm font-semibold text-[#144836]">✓ No matching conflicts found</p>
            <p className="text-xs text-[#57534A] mt-1">
              Selected schedule filters show zero unresolved clashes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D9D4C7]">
            {filteredConflicts.map((c) => (
              <div
                key={c.id}
                className="p-4 hover:bg-[#EDE8DC]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={c.severity} size="xs" dot>
                      {c.severity}
                    </Badge>
                    <span className="font-bold text-[#1B1A17] text-sm">{c.conflict_type}</span>
                    <span className="text-xs font-mono text-[#57534A]">&middot; {c.date}</span>
                    {c.employee_name && (
                      <Badge variant="info" size="xs">
                        {c.employee_name}
                      </Badge>
                    )}
                    {c.brand_name && (
                      <Badge variant="outline" size="xs">
                        {c.brand_name}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-[#1B1A17] leading-relaxed">{c.description}</p>

                  {c.resolution_suggestion && (
                    <div className="text-xs text-[#144836] bg-[#E5EFEA] px-2.5 py-1.5 rounded-[4px] border border-[#8EB8A6]">
                      <span className="font-semibold">Suggested fix: </span>
                      <span>{c.resolution_suggestion}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <Button
                    size="sm"
                    variant={c.is_resolved ? 'outline' : 'secondary'}
                    onClick={() => handleToggleResolve(c)}
                    leftIcon={c.is_resolved ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                  >
                    {c.is_resolved ? 'Re-open' : 'Mark Resolved'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
