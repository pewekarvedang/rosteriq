import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  AlertOctagon,
  Users,
  Network,
  Building2,
  Layers,
  UserCheck,
  CalendarOff,
  Settings,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { conflictService } from '../../services/conflictService';

export const Sidebar: React.FC = () => {
  const [unresolvedConflictsCount, setUnresolvedConflictsCount] = useState<number>(0);

  useEffect(() => {
    const fetchConflicts = async () => {
      try {
        const conflicts = await conflictService.getAll({ is_resolved: false });
        setUnresolvedConflictsCount(conflicts.length);
      } catch {
        // Silent catch for initial load
      }
    };
    fetchConflicts();
    const interval = setInterval(fetchConflicts, 30000);
    return () => clearInterval(interval);
  }, []);

  const navGroups = [
    {
      group: 'Core Operations',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/roster', label: 'Monthly Roster', icon: CalendarDays, badge: 'OR-Tools' },
        { to: '/coverage', label: 'Coverage Analysis', icon: BarChart3 },
        {
          to: '/conflicts',
          label: 'Conflicts Center',
          icon: AlertOctagon,
          badgeCount: unresolvedConflictsCount > 0 ? unresolvedConflictsCount : undefined,
          badgeVariant: 'danger',
        },
      ],
    },
    {
      group: 'Workforce & Organization',
      items: [
        { to: '/employees', label: 'Employees', icon: Users },
        { to: '/pods', label: 'Operational Pods', icon: Network },
        { to: '/assignments', label: 'Role Assignments', icon: UserCheck },
        { to: '/leaves-holidays', label: 'Leaves & Holidays', icon: CalendarOff },
      ],
    },
    {
      group: 'Enterprise Configuration',
      items: [
        { to: '/brands', label: 'Client Brands', icon: Building2 },
        { to: '/processes', label: 'Processes', icon: Layers },
        { to: '/settings', label: 'Rules & Shifts', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-xl tracking-wider">
          R
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-100 tracking-tight text-base">RosterIQ</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">Workforce Optimization</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              {group.group}
            </p>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                        {item.badge}
                      </span>
                    )}

                    {item.badgeCount !== undefined && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                        {item.badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Solver Badge / Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">CP-SAT Engine</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-400 truncate">Google OR-Tools 9.11</p>
          </div>
        </div>

        <div className="mt-2.5 text-center">
          <p className="text-[10px] text-slate-400 tracking-wide">
            DataStraw Assessment
          </p>
        </div>
      </div>
    </aside>
  );
};
