import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarOff,
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

import { availabilityService } from '../../services/availabilityService';
import { holidayService } from '../../services/holidayService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../../context/ToastContext';

import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import {
  EmployeeAvailability,
  EmployeeAvailabilityCreate,
  PublicHoliday,
  PublicHolidayCreate,
  Employee,
  AvailabilityType,
  ApprovalStatus,
} from '../../types';

export const LeavesHolidaysPage: React.FC = () => {
  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<'leaves' | 'holidays'>('leaves');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Data
  const [availabilities, setAvailabilities] = useState<EmployeeAvailability[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals state
  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState<boolean>(false);
  const [isAddHolidayModalOpen, setIsAddHolidayModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Leave Form
  const [leaveForm, setLeaveForm] = useState<EmployeeAvailabilityCreate>({
    employee_id: 0,
    date: new Date().toISOString().split('T')[0],
    availability_type: 'LEAVE',
    leave_type: 'PLANNED_LEAVE',
    status: 'APPROVED',
    reason: '',
    is_full_day: true,
  });

  // Holiday Form
  const [holidayForm, setHolidayForm] = useState<PublicHolidayCreate>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    is_optional: false,
    applicable_region: 'ALL',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [availList, holList, empList] = await Promise.all([
        availabilityService.getAll(),
        holidayService.getAll(),
        employeeService.getAll(),
      ]);
      setAvailabilities(availList);
      setHolidays(holList);
      setEmployees(empList);
    } catch (err: any) {
      showError('Failed to load data', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update status of leave (Approve / Reject)
  const handleUpdateLeaveStatus = async (id: number, newStatus: ApprovalStatus) => {
    try {
      const updated = await availabilityService.update(id, { status: newStatus });
      setAvailabilities((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showSuccess(
        `Leave ${newStatus}`,
        `Availability record #${id} set to ${newStatus}. Note: Roster will revalidate on next solve.`
      );
    } catch (err: any) {
      showError('Status update failed', err.message);
    }
  };

  // Submit Leave
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await availabilityService.create(leaveForm);
      setAvailabilities((prev) => [...prev, created]);
      showSuccess('Leave Recorded', `Leave scheduled for employee #${created.employee_id}.`);
      setIsAddLeaveModalOpen(false);
    } catch (err: any) {
      showError('Failed to record leave', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Holiday
  const handleSubmitHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await holidayService.create(holidayForm);
      setHolidays((prev) => [...prev, created]);
      showSuccess('Public Holiday Added', `${created.name} (${created.date}) registered.`);
      setIsAddHolidayModalOpen(false);
    } catch (err: any) {
      showError('Failed to add holiday', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Holiday
  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Remove this public holiday from the calendar?')) return;
    try {
      await holidayService.delete(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      showSuccess('Holiday Removed', 'Holiday deleted from operating calendar.');
    } catch (err: any) {
      showError('Deletion failed', err.message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading leaves and public holidays calendar..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">LEAVES & PUBLIC HOLIDAYS</h2>
            <Badge variant="purple" size="xs">
              Calendar Engine
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage planned employee leaves, comp-offs, and operating calendar holiday exceptions
          </p>
        </div>

        {/* Tab switcher & Action button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('leaves')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'leaves' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Employee Leaves ({availabilities.length})
            </button>
            <button
              onClick={() => setActiveTab('holidays')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'holidays' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Public Holidays ({holidays.length})
            </button>
          </div>

          {activeTab === 'leaves' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setLeaveForm({
                  employee_id: employees[0]?.id || 1,
                  date: '2026-11-15',
                  availability_type: 'LEAVE',
                  leave_type: 'PLANNED_LEAVE',
                  status: 'APPROVED',
                  reason: 'Personal leave',
                  is_full_day: true,
                });
                setIsAddLeaveModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Record Leave
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setHolidayForm({
                  name: '',
                  date: '2026-11-14',
                  description: 'Diwali Festival of Lights',
                  is_optional: false,
                  applicable_region: 'ALL',
                });
                setIsAddHolidayModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Tab 1: Leaves & Availability Table */}
      {activeTab === 'leaves' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason / Details</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {availabilities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No leave requests recorded.
                    </td>
                  </tr>
                ) : (
                  availabilities.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {a.employee_name || `Employee #${a.employee_id}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{a.date}</td>
                      <td className="px-4 py-3">
                        <Badge variant={a.availability_type === 'LEAVE' ? 'LEAVE' : 'COMP_OFF'} size="xs">
                          {a.leave_type || a.availability_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{a.reason || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={a.status === 'APPROVED' ? 'success' : a.status === 'PENDING' ? 'warning' : 'danger'}
                          size="xs"
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {a.status !== 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateLeaveStatus(a.id, 'APPROVED')}
                              className="text-xs py-1 px-2 text-emerald-400 hover:text-emerald-300"
                            >
                              Approve
                            </Button>
                          )}
                          {a.status !== 'REJECTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateLeaveStatus(a.id, 'REJECTED')}
                              className="text-xs py-1 px-2 text-rose-400 hover:text-rose-300"
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Public Holidays Table */}
      {activeTab === 'holidays' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Holiday Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3 text-center">Optional</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No public holidays configured.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-200">{h.name}</td>
                      <td className="px-4 py-3 font-mono text-indigo-400 font-medium">{h.date}</td>
                      <td className="px-4 py-3 text-slate-400">{h.description || '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{h.applicable_region}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={h.is_optional ? 'default' : 'purple'} size="xs">
                          {h.is_optional ? 'Optional' : 'Mandatory'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="p-1.5 h-auto text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Leave Modal */}
      {isAddLeaveModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddLeaveModalOpen(false)}
          title="Record Planned Leave / Comp-Off"
          subtitle="Register an employee rest date that restricts solver shift assignments"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <Select
              label="Select Employee"
              required
              value={leaveForm.employee_id}
              onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: Number(e.target.value) })}
              options={employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                required
                value={leaveForm.date}
                onChange={(e) => setLeaveForm({ ...leaveForm, date: e.target.value })}
              />
              <Select
                label="Availability Type"
                required
                value={leaveForm.availability_type}
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, availability_type: e.target.value as AvailabilityType })
                }
                options={[
                  { value: 'LEAVE', label: 'Leave' },
                  { value: 'COMP_OFF', label: 'Compensatory Off' },
                  { value: 'UNAVAILABLE', label: 'Unavailable' },
                ]}
              />
            </div>

            <Input
              label="Leave Type Code"
              value={leaveForm.leave_type || ''}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
              placeholder="PLANNED_LEAVE / SICK_LEAVE / COMP_OFF"
            />

            <Input
              label="Reason (Optional)"
              value={leaveForm.reason || ''}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Medical appointment / family function"
            />

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddLeaveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Record Leave
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Holiday Modal */}
      {isAddHolidayModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddHolidayModalOpen(false)}
          title="Add Public Holiday"
          subtitle="Declare a public holiday for operating calendar evaluation"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitHoliday} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Holiday Name"
                required
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="Diwali"
              />
              <Input
                label="Date"
                type="date"
                required
                value={holidayForm.date}
                onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
              />
            </div>

            <Input
              label="Description (Optional)"
              value={holidayForm.description || ''}
              onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
              placeholder="National festival of lights"
            />

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isOpt"
                checked={holidayForm.is_optional}
                onChange={(e) => setHolidayForm({ ...holidayForm, is_optional: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isOpt" className="text-xs text-slate-300 font-medium cursor-pointer">
                Optional / Restricted Holiday
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddHolidayModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Add Holiday
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
