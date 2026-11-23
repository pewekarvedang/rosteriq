import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, CheckCircle2, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import apiClient from '../../services/api';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useRoster();
  const { showSuccess, showError } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<string>(
    () => localStorage.getItem('rosteriq_user_role') || 'Operations Manager'
  );

  const handleRoleChange = (newRole: string) => {
    setActiveRole(newRole);
    localStorage.setItem('rosteriq_user_role', newRole);
    showSuccess('RBAC Role Switched', `Active session updated to '${newRole}'.`);
  };

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      await apiClient.get('/health');
      setBackendStatus('connected');
    } catch {
      setBackendStatus('disconnected');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 45000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return { title: 'Operational Dashboard', desc: 'Real-time workforce KPIs, staffing metrics & roster overview' };
      case '/roster':
        return { title: 'Monthly Roster Management', desc: 'OR-Tools CP-SAT deterministic schedule generation & matrix' };
      case '/coverage':
        return { title: 'Staffing Coverage Analysis', desc: 'Required vs assigned staffing headcount by brand & process' };
      case '/conflicts':
        return { title: 'Scheduling Conflicts Center', desc: 'Audit violations, severity alerts & automated revalidations' };
      case '/employees':
        return { title: 'Employee Management', desc: 'Directory, workload limits, weekly-off rules & availability' };
      case '/pods':
        return { title: 'Operational Pods', desc: 'Pod structures, designated team leads & pod roster distribution' };
      case '/brands':
        return { title: 'Client Brands Management', desc: 'Operating calendars, process assignments & minimum staffing' };
      case '/processes':
        return { title: 'Business Processes', desc: 'CS, Abandoned Cart Conversions, Retention, NDR & custom workflows' };
      case '/assignments':
        return { title: 'Employee Role Assignments', desc: 'Multi-brand & multi-process mapping with start/end dates' };
      case '/leaves-holidays':
        return { title: 'Leaves & Public Holidays', desc: 'Leave approvals, comp-offs, and operating holiday exceptions' };
      case '/settings':
        return { title: 'System Configuration', desc: 'Shift timings, weekly-off policies, workload constraints & engine info' };
      default:
        return { title: 'RosterIQ', desc: 'Intelligent Workforce Planning' };
    }
  };

  const pageInfo = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-8 py-3.5 backdrop-blur-md">
      {/* Title & Description */}
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">{pageInfo.title}</h1>
        <p className="text-xs text-slate-400 mt-0.5">{pageInfo.desc}</p>
      </div>

      {/* Right Controls: Month/Year selector & Backend status */}
      <div className="flex items-center gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-200">
          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer pr-1 font-medium"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1} className="bg-slate-900 text-slate-100">
                {name}
              </option>
            ))}
          </select>

          <span className="text-slate-600">/</span>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer font-medium"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr} className="bg-slate-900 text-slate-100">
                {yr}
              </option>
            ))}
          </select>
        </div>

        {/* RBAC Role Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs text-slate-200">
          <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <select
            value={activeRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer font-medium text-[11px]"
            title="Switch Session Role to test RBAC"
          >
            <option value="Operations Manager" className="bg-slate-900 text-slate-100">
              Ops Manager
            </option>
            <option value="Pod Lead" className="bg-slate-900 text-slate-100">
              Pod Lead
            </option>
            <option value="Employee" className="bg-slate-900 text-slate-100">
              Employee
            </option>
          </select>
        </div>

        {/* Backend Status indicator */}
        <div
          onClick={checkHealth}
          title="FastAPI Backend Health"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-300 cursor-pointer hover:bg-slate-900 transition-colors"
        >
          {backendStatus === 'connected' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500 animate-pulse-subtle" />
              <span className="text-[11px] font-medium text-emerald-400">API Live</span>
            </>
          ) : backendStatus === 'checking' ? (
            <>
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
              <span className="text-[11px] font-medium text-amber-400">Connecting</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-medium text-rose-400">Offline</span>
            </>
          )}
        </div>

        {/* Quick Navigate to Roster Generator if on another page */}
        {location.pathname !== '/roster' && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => navigate('/roster')}
          >
            Open Roster Engine
          </Button>
        )}
      </div>
    </header>
  );
};
