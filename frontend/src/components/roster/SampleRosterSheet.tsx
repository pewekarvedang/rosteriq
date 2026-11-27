import React, { useState } from 'react';
import { MonthlyGenerationResponse } from '../../types';

interface SampleShiftCell {
  code: 'MORNING' | 'GENERAL' | 'EVENING' | 'NIGHT' | 'OFF' | 'LEAVE' | 'GAP' | 'CLASH';
  time?: string;
  account?: string;
  label: string;
}

interface SampleStaffRow {
  id: string;
  name: string;
  pod: string;
  baseHours: number;
  resolvedHours?: number;
  days: SampleShiftCell[];
  resolvedDays?: SampleShiftCell[];
}

const SAMPLE_DAYS = [
  { key: 'mon', label: 'Mon', date: '02 Nov' },
  { key: 'tue', label: 'Tue', date: '03 Nov' },
  { key: 'wed', label: 'Wed', date: '04 Nov' },
  { key: 'thu', label: 'Thu', date: '05 Nov' },
  { key: 'fri', label: 'Fri', date: '06 Nov' },
  { key: 'sat', label: 'Sat', date: '07 Nov' },
  { key: 'sun', label: 'Sun', date: '08 Nov' },
];

const INITIAL_SAMPLE_ROWS: SampleStaffRow[] = [
  {
    id: 'emp-1',
    name: 'H. Kowalski',
    pod: 'Alpha',
    baseHours: 40,
    days: [
      { code: 'MORNING', time: '06:00–14:00', account: 'GlowSkin · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'GlowSkin · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'GlowSkin · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'GlowSkin · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'GlowSkin · CS', label: 'Morning' },
      { code: 'OFF', label: 'Off' },
      { code: 'OFF', label: 'Off' },
    ],
  },
  {
    id: 'emp-2',
    name: 'P. Deshmukh',
    pod: 'Beta',
    baseHours: 48,
    resolvedHours: 40,
    days: [
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'CLASH', time: '06:00 + 14:00', account: 'Double shift (16h)', label: 'Clash' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'OFF', label: 'Off' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'OmniTech · NDR', label: 'General' },
    ],
    resolvedDays: [
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'MORNING', time: '06:00–14:00', account: 'OmniTech · CS', label: 'Morning' },
      { code: 'OFF', label: 'Off' },
      { code: 'OFF', label: 'Off' },
    ],
  },
  {
    id: 'emp-3',
    name: 'R. Mehta',
    pod: 'Alpha',
    baseHours: 40,
    days: [
      { code: 'GENERAL', time: '09:00–17:00', account: 'FreshRoast · CS', label: 'General' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'FreshRoast · CS', label: 'General' },
      { code: 'LEAVE', time: 'Approved', account: 'Planned leave', label: 'Leave' },
      { code: 'EVENING', time: '14:00–22:00', account: 'AuraBeauty · CS', label: 'Evening' },
      { code: 'EVENING', time: '14:00–22:00', account: 'AuraBeauty · CS', label: 'Evening' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'FreshRoast · CS', label: 'General' },
      { code: 'OFF', label: 'Off' },
    ],
  },
  {
    id: 'emp-4',
    name: 'A. Khan',
    pod: 'Delta',
    baseHours: 40,
    days: [
      { code: 'OFF', label: 'Off' },
      { code: 'EVENING', time: '14:00–22:00', account: 'Titan · RET', label: 'Evening' },
      { code: 'EVENING', time: '14:00–22:00', account: 'Titan · RET', label: 'Evening' },
      { code: 'EVENING', time: '14:00–22:00', account: 'Titan · RET', label: 'Evening' },
      { code: 'OFF', label: 'Off' },
      { code: 'EVENING', time: '14:00–22:00', account: 'Titan · RET', label: 'Evening' },
      { code: 'EVENING', time: '14:00–22:00', account: 'Titan · RET', label: 'Evening' },
    ],
  },
  {
    id: 'emp-5',
    name: 'D. Chen',
    pod: 'Gamma',
    baseHours: 40,
    days: [
      { code: 'NIGHT', time: '22:00–06:00', account: 'AuraBeauty · 24/7', label: 'Night' },
      { code: 'NIGHT', time: '22:00–06:00', account: 'AuraBeauty · 24/7', label: 'Night' },
      { code: 'NIGHT', time: '22:00–06:00', account: 'AuraBeauty · 24/7', label: 'Night' },
      { code: 'NIGHT', time: '22:00–06:00', account: 'AuraBeauty · 24/7', label: 'Night' },
      { code: 'NIGHT', time: '22:00–06:00', account: 'AuraBeauty · 24/7', label: 'Night' },
      { code: 'OFF', label: 'Off' },
      { code: 'OFF', label: 'Off' },
    ],
  },
  {
    id: 'emp-6',
    name: 'S. Nair',
    pod: 'Beta',
    baseHours: 32,
    resolvedHours: 40,
    days: [
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'OFF', label: 'Open' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'GAP', time: '14:00–22:00', account: 'Needs cover (1 short)', label: 'Gap' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'OFF', label: 'Off' },
    ],
    resolvedDays: [
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'OFF', label: 'Off' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'EVENING', time: '14:00–22:00', account: 'Titan · RET', label: 'Evening' },
      { code: 'GENERAL', time: '09:00–17:00', account: 'Stellar · ACC', label: 'General' },
      { code: 'OFF', label: 'Off' },
    ],
  },
];

interface SampleRosterSheetProps {
  generationResult: MonthlyGenerationResponse | null;
  onOpenSolver: () => void;
}

export const SampleRosterSheet: React.FC<SampleRosterSheetProps> = ({
  generationResult,
  onOpenSolver,
}) => {
  const [isResolved, setIsResolved] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [mobileDayIdx, setMobileDayIdx] = useState(2); // Default Wed (clash visible on mobile)
  const [showLiveWeek, setShowLiveWeek] = useState(false);

  const liveEmployees = generationResult?.employee_wise_schedules
    ? Object.values(generationResult.employee_wise_schedules).slice(0, 6)
    : [];
  const hasLiveRoster = liveEmployees.length > 0;

  const liveDateKeys = hasLiveRoster
    ? Object.keys(liveEmployees[0].days).sort().slice(0, 7)
    : [];

  const handleResolveToggle = () => {
    setHasAnimated(true);
    setIsResolved((prev) => !prev);
  };

  const renderCellBadge = (cell: SampleShiftCell, animateSettle: boolean) => {
    if (cell.code === 'CLASH') {
      return (
        <div className="pattern-clash border-2 border-dashed border-[#911D1D] rounded-[4px] px-2 py-1.5 text-left">
          <div className="flex items-center justify-between gap-1 font-mono text-[11px] font-semibold text-[#911D1D]">
            <span>✕ CLASH</span>
          </div>
          <div className="font-mono text-[11px] font-medium text-[#1B1A17] mt-0.5">{cell.time}</div>
          <div className="text-[11px] text-[#911D1D] truncate">{cell.account}</div>
        </div>
      );
    }

    if (cell.code === 'GAP') {
      return (
        <div className="pattern-gap border border-dashed border-[#8F5200] rounded-[4px] px-2 py-1.5 text-left">
          <div className="flex items-center justify-between gap-1 font-mono text-[11px] font-semibold text-[#784300]">
            <span>△ GAP</span>
          </div>
          <div className="font-mono text-[11px] font-medium text-[#1B1A17] mt-0.5">{cell.time}</div>
          <div className="text-[11px] text-[#784300] truncate">{cell.account}</div>
        </div>
      );
    }

    if (cell.code === 'LEAVE') {
      return (
        <div className="bg-[#FBF1DC] border border-[#D9AD5B] rounded-[4px] px-2 py-1.5 text-left">
          <div className="font-mono text-[11px] font-semibold text-[#784300]">▲ LEAVE</div>
          <div className="font-mono text-[11px] text-[#57534A] mt-0.5">{cell.time}</div>
          <div className="text-[11px] text-[#57534A] truncate">{cell.account}</div>
        </div>
      );
    }

    if (cell.code === 'OFF') {
      return (
        <div className="bg-[#EDE8DC]/60 border border-[#D9D4C7] rounded-[4px] px-2 py-2 text-left text-[#57534A]">
          <span className="font-mono text-[11px]">— {cell.label}</span>
        </div>
      );
    }

    return (
      <div
        className={`bg-[#E5EFEA] border border-[#8EB8A6] rounded-[4px] px-2 py-1.5 text-left ${
          animateSettle ? 'animate-clash-settle' : ''
        }`}
      >
        <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-[#144836]">
          <span>✓ {cell.label}</span>
        </div>
        <div className="font-mono text-[11px] font-medium text-[#1B1A17] mt-0.5">{cell.time}</div>
        <div className="text-[11px] text-[#57534A] truncate">{cell.account}</div>
      </div>
    );
  };

  return (
    <section aria-labelledby="weekly-roster-heading" className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px]">
      {/* Roster Sheet Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 py-4 border-b border-[#D9D4C7] bg-[#EDE8DC]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-[2px] border border-[#1B1A17] bg-[#1B1A17] text-[#FBF9F5] font-mono text-[11px] font-semibold uppercase tracking-wider">
              {showLiveWeek && hasLiveRoster ? 'Solved roster' : 'Sample roster'}
            </span>
            <h3 id="weekly-roster-heading" className="text-sm font-bold text-[#1B1A17] tracking-tight">
              {showLiveWeek && hasLiveRoster
                ? `${generationResult?.name} · First 7 days`
                : 'Week 02–08 Nov 2026 · Shift Timetable'}
            </h3>
          </div>
          <p className="text-xs text-[#57534A]">
            {showLiveWeek && hasLiveRoster
              ? 'Live solver assignments pulled from current month schedule.'
              : isResolved
                ? 'Clash cleared and open evening gap filled within 40h weekly caps.'
                : '1 shift overlap on Wednesday (P. Deshmukh, 48h) and 1 open gap on Friday evening (14:00–22:00).'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasLiveRoster && (
            <div className="inline-flex rounded-[4px] border border-[#B8B1A1] bg-[#FBF9F5] p-0.5">
              <button
                type="button"
                onClick={() => setShowLiveWeek(false)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[2px] cursor-pointer ${
                  !showLiveWeek ? 'bg-[#1B1A17] text-[#FBF9F5]' : 'text-[#57534A] hover:text-[#1B1A17]'
                }`}
              >
                Sample roster
              </button>
              <button
                type="button"
                onClick={() => setShowLiveWeek(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[2px] cursor-pointer ${
                  showLiveWeek ? 'bg-[#1B1A17] text-[#FBF9F5]' : 'text-[#57534A] hover:text-[#1B1A17]'
                }`}
              >
                Live period
              </button>
            </div>
          )}

          {!showLiveWeek && (
            <button
              type="button"
              onClick={handleResolveToggle}
              className={`px-3 py-1.5 rounded-[4px] border text-xs font-semibold cursor-pointer transition-colors ${
                isResolved
                  ? 'border-[#B8B1A1] bg-[#FBF9F5] text-[#1B1A17] hover:bg-[#EDE8DC]'
                  : 'border-[#911D1D] bg-[#911D1D] text-[#FBF9F5] hover:bg-[#751616]'
              }`}
            >
              {isResolved ? 'Reset sample clash' : 'Resolve clash & fill gap'}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSolver}
            className="px-3 py-1.5 rounded-[4px] border border-[#164B78] bg-[#164B78] text-[#FBF9F5] hover:bg-[#113A5E] text-xs font-semibold cursor-pointer transition-colors"
          >
            Run Monthly Solver
          </button>
        </div>
      </div>

      {/* Ruled Legend Strip (Color + Shape + Text) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 border-b border-[#D9D4C7] bg-[#F6F3EC] text-xs text-[#57534A]">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#1B1A17]">
          Key:
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#E5EFEA] border border-[#8EB8A6] text-[#144836] font-mono text-[10px] font-semibold">
            ✓
          </span>
          <span>Covered shift</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="pattern-gap px-1.5 py-0.5 rounded-[2px] border border-dashed border-[#8F5200] text-[#784300] font-mono text-[10px] font-semibold">
            △
          </span>
          <span>Coverage gap</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="pattern-clash px-1.5 py-0.5 rounded-[2px] border border-dashed border-[#911D1D] text-[#911D1D] font-mono text-[10px] font-semibold">
            ✕
          </span>
          <span>Shift clash / over 40h</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#FBF1DC] border border-[#D9AD5B] text-[#784300] font-mono text-[10px] font-semibold">
            ▲
          </span>
          <span>Approved leave</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-[2px] bg-[#EDE8DC] border border-[#D9D4C7] text-[#57534A] font-mono text-[10px]">
            —
          </span>
          <span>Weekly off</span>
        </span>
      </div>

      {/* Mobile Day-by-Day Agenda Switcher (< md viewports) */}
      {!showLiveWeek && (
        <div className="md:hidden border-b border-[#D9D4C7] bg-[#FBF9F5]">
          <div className="flex overflow-x-auto border-b border-[#D9D4C7] bg-[#F6F3EC]">
            {SAMPLE_DAYS.map((day, idx) => {
              const isWedClash = idx === 2 && !isResolved;
              const isFriGap = idx === 4 && !isResolved;
              const active = mobileDayIdx === idx;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setMobileDayIdx(idx)}
                  className={`flex-1 min-w-[68px] px-2 py-2 text-center border-r border-[#D9D4C7] last:border-r-0 cursor-pointer ${
                    active ? 'bg-[#1B1A17] text-[#FBF9F5]' : 'text-[#1B1A17]'
                  }`}
                >
                  <div className="font-mono text-[11px] font-semibold">{day.label}</div>
                  <div className="font-mono text-[10px] opacity-80">{day.date.split(' ')[0]}</div>
                  {isWedClash && (
                    <div className="font-mono text-[9px] text-[#FAE6E6] bg-[#911D1D] rounded-[2px] mt-0.5 px-1">
                      ✕ 1
                    </div>
                  )}
                  {isFriGap && (
                    <div className="font-mono text-[9px] text-[#784300] bg-[#FBF1DC] rounded-[2px] mt-0.5 px-1">
                      △ 1
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="divide-y divide-[#D9D4C7]">
            {INITIAL_SAMPLE_ROWS.map((row) => {
              const cells = isResolved && row.resolvedDays ? row.resolvedDays : row.days;
              const hours = isResolved && row.resolvedHours !== undefined ? row.resolvedHours : row.baseHours;
              const cell = cells[mobileDayIdx];
              const isOver = hours > 40;
              return (
                <div key={row.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#1B1A17]">{row.name}</div>
                    <div className="font-mono text-[11px] text-[#57534A] tabular-nums">
                      Pod {row.pod} &middot;{' '}
                      <span className={isOver ? 'text-[#911D1D] font-semibold' : ''}>{hours}.0 / 40h</span>
                    </div>
                  </div>
                  <div className="w-40 shrink-0">
                    {renderCellBadge(cell, hasAnimated && isResolved && !!row.resolvedDays)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop / Tablet Timetable Matrix (also horizontal scroll with sticky left name column) */}
      <div className={`${!showLiveWeek ? 'hidden md:block' : 'block'} overflow-x-auto`}>
        {showLiveWeek && hasLiveRoster ? (
          <table className="w-full text-left border-collapse tabular-nums min-w-[780px]">
            <thead>
              <tr className="border-b border-[#B8B1A1] bg-[#F6F3EC] text-[11px] font-mono uppercase tracking-wider text-[#57534A]">
                <th className="sticky left-0 z-10 bg-[#F6F3EC] px-4 py-3 border-r border-[#B8B1A1] min-w-[180px]">
                  Staff / Hours
                </th>
                {liveDateKeys.map((dk) => (
                  <th key={dk} className="px-2 py-3 border-r border-[#D9D4C7] last:border-r-0 min-w-[116px]">
                    {dk}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {liveEmployees.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-[#EDE8DC]/40">
                  <td className="sticky left-0 z-10 bg-[#FBF9F5] px-4 py-2.5 border-r border-[#B8B1A1]">
                    <div className="text-xs font-semibold text-[#1B1A17] truncate">{emp.full_name}</div>
                    <div className="font-mono text-[11px] text-[#57534A]">
                      {emp.employee_code} &middot; {emp.total_hours.toFixed(0)}h/mo
                    </div>
                  </td>
                  {liveDateKeys.map((dk) => {
                    const dayData = emp.days[dk];
                    if (!dayData) {
                      return (
                        <td key={dk} className="px-2 py-2 border-r border-[#D9D4C7] font-mono text-xs text-[#57534A]">
                          —
                        </td>
                      );
                    }
                    const primaryProc = dayData.processes[0];
                    const cell: SampleShiftCell = dayData.is_working
                      ? {
                          code: 'GENERAL',
                          label: dayData.shift_code || 'Working',
                          time: dayData.shift || 'Assigned shift',
                          account: primaryProc ? `${primaryProc.brand_name}` : 'Assigned',
                        }
                      : dayData.status.includes('LEAVE')
                        ? { code: 'LEAVE', label: 'Leave', time: 'Approved', account: dayData.status }
                        : { code: 'OFF', label: dayData.status === 'WEEKLY_OFF' ? 'Off' : dayData.status };
                    return (
                      <td key={dk} className="p-1.5 border-r border-[#D9D4C7] last:border-r-0 align-top">
                        {renderCellBadge(cell, false)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse tabular-nums min-w-[880px]">
            <thead>
              <tr className="border-b border-[#B8B1A1] bg-[#F6F3EC] text-[11px] font-mono uppercase tracking-wider text-[#57534A]">
                <th className="sticky left-0 z-10 bg-[#F6F3EC] px-4 py-3 border-r border-[#B8B1A1] min-w-[196px]">
                  Staff &middot; Weekly Cap
                </th>
                {SAMPLE_DAYS.map((day) => (
                  <th
                    key={day.key}
                    className={`px-2 py-3 border-r border-[#D9D4C7] last:border-r-0 min-w-[116px] ${
                      day.key === 'sat' || day.key === 'sun' ? 'bg-[#EDE8DC]/60' : ''
                    }`}
                  >
                    <span className="text-[#1B1A17] font-semibold">{day.label}</span>{' '}
                    <span className="text-[#57534A]">{day.date}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {INITIAL_SAMPLE_ROWS.map((row) => {
                const cells = isResolved && row.resolvedDays ? row.resolvedDays : row.days;
                const hours = isResolved && row.resolvedHours !== undefined ? row.resolvedHours : row.baseHours;
                const isOver = hours > 40;
                const isUnder = hours < 40;

                return (
                  <tr key={row.id} className="hover:bg-[#EDE8DC]/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-[#FBF9F5] px-4 py-2 border-r border-[#B8B1A1] align-middle">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#1B1A17] truncate">{row.name}</span>
                        <span
                          className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-[2px] border ${
                            isOver
                              ? 'bg-[#FAE6E6] text-[#911D1D] border-[#D67A7A]'
                              : isUnder
                                ? 'bg-[#FBF1DC] text-[#784300] border-[#D9AD5B]'
                                : 'bg-[#F6F3EC] text-[#1B1A17] border-[#D9D4C7]'
                          }`}
                        >
                          {hours}.0/40h
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#57534A] mt-0.5">
                        Pod {row.pod} {isOver ? '· ✕ Overtime' : isUnder ? '· Spare 8h' : ''}
                      </div>
                    </td>

                    {cells.map((cell, dayIdx) => {
                      const animateCell =
                        hasAnimated &&
                        isResolved &&
                        ((row.id === 'emp-2' && (dayIdx === 2 || dayIdx === 6)) ||
                          (row.id === 'emp-6' && dayIdx === 4));
                      return (
                        <td
                          key={`${row.id}-${SAMPLE_DAYS[dayIdx].key}`}
                          className={`p-1.5 border-r border-[#D9D4C7] last:border-r-0 align-top ${
                            dayIdx >= 5 ? 'bg-[#EDE8DC]/25' : ''
                          }`}
                        >
                          {renderCellBadge(cell, animateCell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Coverage Tally Footer Row */}
              <tr className="border-t-2 border-[#B8B1A1] bg-[#F6F3EC] font-mono text-[11px]">
                <td className="sticky left-0 z-10 bg-[#F6F3EC] px-4 py-2.5 border-r border-[#B8B1A1] font-semibold text-[#1B1A17]">
                  Shift Coverage
                </td>
                {SAMPLE_DAYS.map((day, idx) => {
                  const isClashDay = idx === 2 && !isResolved;
                  const isGapDay = idx === 4 && !isResolved;
                  if (isClashDay) {
                    return (
                      <td key={day.key} className="px-2 py-2 border-r border-[#D9D4C7] font-semibold text-[#911D1D] bg-[#FAE6E6]">
                        ✕ 1 clash
                      </td>
                    );
                  }
                  if (isGapDay) {
                    return (
                      <td key={day.key} className="px-2 py-2 border-r border-[#D9D4C7] font-semibold text-[#784300] pattern-gap">
                        △ 1 gap (14:00)
                      </td>
                    );
                  }
                  return (
                    <td key={day.key} className="px-2 py-2 border-r border-[#D9D4C7] last:border-r-0 font-semibold text-[#144836]">
                      ✓ Covered
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
