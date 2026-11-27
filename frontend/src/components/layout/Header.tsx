import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Menu, RefreshCw, Server, Shield } from 'lucide-react';
import { useRoster } from '../../context/RosterContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import apiClient, { getApiBaseUrl, setCustomBackendUrl } from '../../services/api';

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

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedMonth, setSelectedMonth, selectedYear, setSelectedYear } = useRoster();
  const { showSuccess, showError } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState<boolean>(false);
  const [backendUrlInput, setBackendUrlInput] = useState<string>(() => {
    return localStorage.getItem('rosteriq_backend_url') || '';
  });
  const [activeRole, setActiveRole] = useState<string>(
    () => localStorage.getItem('rosteriq_user_role') || 'Operations Manager'
  );

  const handleRoleChange = (newRole: string) => {
    setActiveRole(newRole);
    localStorage.setItem('rosteriq_user_role', newRole);
    showSuccess('Session role updated', `Active role set to ${newRole}.`);
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

  const handleSaveBackendUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomBackendUrl(backendUrlInput);
    setIsCheckingHealth(true);
    try {
      await apiClient.get('/health');
      setBackendStatus('connected');
      showSuccess('Server connected', `Connected to ${getApiBaseUrl()}`);
      setIsBackendModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach endpoint';
      setBackendStatus('disconnected');
      showError('Connection failed', `Could not reach ${getApiBaseUrl()}: ${msg}`);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleResetBackendUrl = () => {
    setCustomBackendUrl('');
    setBackendUrlInput('');
    checkHealth();
    showSuccess('Endpoint reset', 'Using default API URL.');
    setIsBackendModalOpen(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 45000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/':
        return { title: 'Operational Dashboard', desc: 'Weekly schedule view, staffing ledger, and shift gaps' };
      case '/roster':
        return { title: 'Monthly Roster Sheet', desc: 'Full-month CP-SAT shift assignments and manual cell locks' };
      case '/coverage':
        return { title: 'Staffing Coverage Analysis', desc: 'Required headcount per brand process vs scheduled staff' };
      case '/conflicts':
        return { title: 'Scheduling Conflicts Center', desc: 'Overlapping shifts, weekly-off breaches, and leave clashes' };
      case '/employees':
        return { title: 'Employee Directory', desc: 'Hour caps, weekly off preferences, and pod placement' };
      case '/pods':
        return { title: 'Operational Pods', desc: 'Team leads and assigned staff grouped by unit' };
      case '/brands':
        return { title: 'Client Brands', desc: 'Operating calendars and minimum shift headcount per account' };
      case '/processes':
        return { title: 'Business Processes', desc: 'CS, Abandoned Cart, Retention, and NDR shift queues' };
      case '/assignments':
        return { title: 'Employee Role Assignments', desc: 'Staff eligibility across brands, processes, and active dates' };
      case '/leaves-holidays':
        return { title: 'Leaves & Public Holidays', desc: 'Approved time off, comp-offs, and non-operating dates' };
      case '/settings':
        return { title: 'System Configuration', desc: 'Shift timings, weekly hour limits, and solver constraints' };
      default:
        return { title: 'RosterIQ', desc: 'Workforce shift roster and coverage timetable' };
    }
  };

  const pageInfo = getPageTitle(location.pathname);

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-[#D9D4C7] bg-[#FBF9F5] px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-[4px] border border-[#D9D4C7] text-[#1B1A17] hover:bg-[#EDE8DC] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#1B1A17] tracking-tight truncate">{pageInfo.title}</h1>
            <p className="text-xs text-[#57534A] truncate">{pageInfo.desc}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-[#D9D4C7] bg-[#F6F3EC] text-xs text-[#1B1A17] font-mono tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-[#57534A] shrink-0" />
            <select
              aria-label="Roster Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent border-none text-[#1B1A17] focus:outline-none cursor-pointer font-medium"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1} className="bg-[#FBF9F5] text-[#1B1A17]">
                  {name}
                </option>
              ))}
            </select>
            <span className="text-[#57534A]">/</span>
            <select
              aria-label="Roster Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent border-none text-[#1B1A17] focus:outline-none cursor-pointer font-medium"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr} className="bg-[#FBF9F5] text-[#1B1A17]">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* RBAC Role Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-[#D9D4C7] bg-[#F6F3EC] text-xs text-[#1B1A17]">
            <Shield className="w-3.5 h-3.5 text-[#57534A] shrink-0" />
            <select
              value={activeRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="bg-transparent border-none text-[#1B1A17] focus:outline-none cursor-pointer font-medium text-xs"
              title="Switch Session Role to test RBAC"
            >
              <option value="Operations Manager" className="bg-[#FBF9F5] text-[#1B1A17]">
                Ops Manager
              </option>
              <option value="Pod Lead" className="bg-[#FBF9F5] text-[#1B1A17]">
                Pod Lead
              </option>
              <option value="Employee" className="bg-[#FBF9F5] text-[#1B1A17]">
                Employee
              </option>
            </select>
          </div>

          {/* API Connection Indicator (color + glyph + label) */}
          <button
            type="button"
            onClick={() => setIsBackendModalOpen(true)}
            title="Configure API server URL"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border font-mono text-[11px] font-medium cursor-pointer transition-colors ${
              backendStatus === 'connected'
                ? 'border-[#8EB8A6] bg-[#E5EFEA] text-[#144836]'
                : backendStatus === 'checking' || isCheckingHealth
                  ? 'border-[#D9AD5B] bg-[#FBF1DC] text-[#784300]'
                  : 'border-[#D67A7A] bg-[#FAE6E6] text-[#911D1D]'
            }`}
          >
            {backendStatus === 'connected' ? (
              <>
                <span aria-hidden="true">✓</span>
                <span>API live</span>
              </>
            ) : backendStatus === 'checking' || isCheckingHealth ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin motion-reduce:animate-none" />
                <span>Connecting</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">✕</span>
                <span>Offline · Link</span>
              </>
            )}
          </button>

          {location.pathname !== '/roster' && (
            <Button size="sm" variant="primary" onClick={() => navigate('/roster')}>
              Open Roster Sheet
            </Button>
          )}
        </div>
      </header>

      {/* Backend Connection Modal */}
      {isBackendModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsBackendModalOpen(false)}
          title="API Server Connection"
          subtitle="Configure the FastAPI roster solver endpoint"
          maxWidth="md"
        >
          <form onSubmit={handleSaveBackendUrl} className="space-y-4">
            <div className="p-3 rounded-[4px] bg-[#F6F3EC] border border-[#D9D4C7] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#57534A]">Status</span>
                <span
                  className={`font-mono font-semibold ${
                    backendStatus === 'connected' ? 'text-[#144836]' : 'text-[#911D1D]'
                  }`}
                >
                  {backendStatus === 'connected' ? '✓ Connected' : '✕ Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#57534A] shrink-0">Endpoint</span>
                <span className="font-mono text-[#164B78] truncate" title={getApiBaseUrl()}>
                  {getApiBaseUrl()}
                </span>
              </div>
            </div>

            <Input
              label="Server Base URL"
              placeholder="https://rosteriq-backend-9aje.onrender.com"
              value={backendUrlInput}
              onChange={(e) => setBackendUrlInput(e.target.value)}
              helperText="Enter your hosted backend URL or http://127.0.0.1:8000 for local development."
            />

            <div className="flex items-center justify-between pt-4 border-t border-[#D9D4C7]">
              <Button type="button" variant="ghost" size="sm" onClick={handleResetBackendUrl}>
                Reset default
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBackendModalOpen(false)}>
                  Close
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isCheckingHealth}
                  leftIcon={<Server className="w-3.5 h-3.5" />}
                >
                  Save &amp; Connect
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
