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
} from 'lucide-react';
import { conflictService } from '../../services/conflictService';

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const [unresolvedConflictsCount, setUnresolvedConflictsCount] = useState<number>(0);

  useEffect(() => {
    const fetchConflicts = async () => {
      try {
        const conflicts = await conflictService.getAll({ is_resolved: false });
        setUnresolvedConflictsCount(conflicts.length);
      } catch {
        // Silent catch during disconnected initial boot
      }
    };
    fetchConflicts();
    const interval = setInterval(fetchConflicts, 30000);
    return () => clearInterval(interval);
  }, []);

  const navGroups = [
    {
      group: 'Schedule',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/roster', label: 'Monthly Roster', icon: CalendarDays, badge: 'CP-SAT' },
        { to: '/coverage', label: 'Coverage Analysis', icon: BarChart3 },
        {
          to: '/conflicts',
          label: 'Conflicts Center',
          icon: AlertOctagon,
          badgeCount: unresolvedConflictsCount > 0 ? unresolvedConflictsCount : undefined,
        },
      ],
    },
    {
      group: 'Staff & Teams',
      items: [
        { to: '/employees', label: 'Employees', icon: Users },
        { to: '/pods', label: 'Operational Pods', icon: Network },
        { to: '/assignments', label: 'Role Assignments', icon: UserCheck },
        { to: '/leaves-holidays', label: 'Leaves & Holidays', icon: CalendarOff },
      ],
    },
    {
      group: 'Accounts & Rules',
      items: [
        { to: '/brands', label: 'Client Brands', icon: Building2 },
        { to: '/processes', label: 'Processes', icon: Layers },
        { to: '/settings', label: 'Rules & Shifts', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-[#D9D4C7] bg-[#FBF9F5] flex flex-col h-screen sticky top-0 select-none">
      {/* Timetable Masthead */}
      <div className="px-4 py-4 border-b border-[#D9D4C7] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="1" y="1" width="22" height="22" rx="2" fill="#F6F3EC" stroke="#1B1A17" strokeWidth="1.5" />
            <rect x="1" y="1" width="22" height="6" fill="#1B1A17" />
            <line x1="9" y1="7" x2="9" y2="23" stroke="#D9D4C7" strokeWidth="1.2" />
            <line x1="16" y1="7" x2="16" y2="23" stroke="#D9D4C7" strokeWidth="1.2" />
            <line x1="1" y1="13" x2="23" y2="13" stroke="#D9D4C7" strokeWidth="1.2" />
            <rect x="3" y="9" width="4" height="2.5" fill="#164B78" />
            <rect x="11" y="15" width="4" height="2.5" fill="#144836" />
          </svg>
          <div>
            <span className="font-bold text-[#1B1A17] tracking-tight text-base block leading-none">
              RosterIQ
            </span>
            <span className="font-mono text-[10px] text-[#57534A] uppercase tracking-wider mt-1 block">
              Shift Timetable
            </span>
          </div>
        </div>
      </div>

      {/* Ruled Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group}>
            <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#57534A] mb-2">
              {group.group}
            </p>
            <nav className="space-y-0.5" aria-label={group.group}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2 py-2 rounded-[4px] text-sm transition-colors border-l-2 ${
                        isActive
                          ? 'border-[#164B78] bg-[#EDE8DC] text-[#164B78] font-semibold'
                          : 'border-transparent text-[#1B1A17] hover:bg-[#EDE8DC]/60 font-normal'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0 text-[#57534A]" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 font-mono text-[10px] font-medium rounded-[2px] bg-[#EDE8DC] text-[#57534A] border border-[#D9D4C7]">
                        {item.badge}
                      </span>
                    )}

                    {item.badgeCount !== undefined && (
                      <span className="px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded-[2px] bg-[#FAE6E6] text-[#911D1D] border border-[#D67A7A] tabular-nums">
                        ✕ {item.badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Solver Spec Footer */}
      <div className="p-4 border-t border-[#D9D4C7] bg-[#F6F3EC]">
        <div className="font-mono text-[11px] text-[#1B1A17] font-medium">
          OR-Tools CP-SAT
        </div>
        <p className="text-[11px] text-[#57534A] mt-0.5">
          40h/wk cap &middot; 8h/day &middot; 6 max days
        </p>
      </div>
    </aside>
  );
};
