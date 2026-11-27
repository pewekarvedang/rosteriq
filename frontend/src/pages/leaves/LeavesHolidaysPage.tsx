import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { availabilityService } from '../../services/availabilityService';
import { holidayService } from '../../services/holidayService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../../context/ToastContext';

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
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState<'leaves' | 'holidays'>('leaves');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [availabilities, setAvailabilities] = useState<EmployeeAvailability[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isAddLeaveModalOpen, setIsAddLeaveModalOpen] = useState<boolean>(false);
  const [isAddHolidayModalOpen, setIsAddHolidayModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [leaveForm, setLeaveForm] = useState<EmployeeAvailabilityCreate>({
    employee_id: 0,
    date: new Date().toISOString().split('T')[0],
    availability_type: 'LEAVE',
    leave_type: 'PLANNED_LEAVE',
    status: 'APPROVED',
    reason: '',
    is_full_day: true,
  });

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch leaves & holidays';
      showError('Failed to load data', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateLeaveStatus = async (id: number, newStatus: ApprovalStatus) => {
    try {
      const updated = await availabilityService.update(id, { status: newStatus });
      setAvailabilities((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showSuccess(
        `Leave ${newStatus}`,
        `Availability record #${id} set to ${newStatus}. Re-run solver to update roster.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      showError('Status update failed', message);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await availabilityService.create(leaveForm);
      setAvailabilities((prev) => [...prev, created]);
      showSuccess('Leave Recorded', `Saved for employee #${created.employee_id}.`);
      setIsAddLeaveModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save leave';
      showError('Failed to record leave', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await holidayService.create(holidayForm);
      setHolidays((prev) => [...prev, created]);
      showSuccess('Public Holiday Added', `${created.name} (${created.date}) registered.`);
      setIsAddHolidayModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to add holiday';
      showError('Failed to add holiday', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm('Remove this public holiday from the calendar?')) return;
    try {
      await holidayService.delete(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      showSuccess('Holiday Removed', 'Deleted from calendar.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      showError('Deletion failed', message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading leaves and public holidays..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">LEAVES &amp; PUBLIC HOLIDAYS</h2>
          <p className="text-xs text-[#57534A] mt-1">
            Approved staff leave, compensatory offs, and non-operating calendar holidays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-[#FBF9F5] p-0.5 rounded-[4px] border border-[#D9D4C7] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('leaves')}
              className={`px-3 py-1.5 rounded-[2px] font-medium cursor-pointer ${
                activeTab === 'leaves' ? 'bg-[#164B78] text-[#FBF9F5]' : 'text-[#57534A] hover:text-[#1B1A17]'
              }`}
            >
              Employee Leaves ({availabilities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('holidays')}
              className={`px-3 py-1.5 rounded-[2px] font-medium cursor-pointer ${
                activeTab === 'holidays' ? 'bg-[#164B78] text-[#FBF9F5]' : 'text-[#57534A] hover:text-[#1B1A17]'
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
                  description: '',
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

      {/* Tab 1: Leaves Table */}
      {activeTab === 'leaves' && (
        <div className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {availabilities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#57534A]">
                      No leave entries recorded.
                    </td>
                  </tr>
                ) : (
                  availabilities.map((a) => (
                    <tr key={a.id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1B1A17]">
                        {a.employee_name || `Employee #${a.employee_id}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#1B1A17]">{a.date}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            a.availability_type === 'LEAVE'
                              ? 'LEAVE'
                              : a.availability_type === 'COMP_OFF'
                                ? 'COMP_OFF'
                                : 'UNAVAILABLE'
                          }
                          size="xs"
                          dot
                        >
                          {a.leave_type || a.availability_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[#57534A]">{a.reason || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={a.status === 'APPROVED' ? 'success' : a.status === 'PENDING' ? 'warning' : 'danger'}
                          size="xs"
                          dot
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
                              className="text-xs py-1 px-2 text-[#144836]"
                            >
                              Approve
                            </Button>
                          )}
                          {a.status !== 'REJECTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateLeaveStatus(a.id, 'REJECTED')}
                              className="text-xs py-1 px-2 text-[#911D1D]"
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
        </div>
      )}

      {/* Tab 2: Holidays Table */}
      {activeTab === 'holidays' && (
        <div className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
                <tr>
                  <th className="px-4 py-3">Holiday Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3 text-center">Rule</th>
                  <th className="px-4 py-3 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#57534A]">
                      No public holidays configured.
                    </td>
                  </tr>
                ) : (
                  holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#1B1A17]">{h.name}</td>
                      <td className="px-4 py-3 font-mono text-[#164B78] font-medium">{h.date}</td>
                      <td className="px-4 py-3 text-[#57534A]">{h.description || '—'}</td>
                      <td className="px-4 py-3 font-mono text-[#57534A]">{h.applicable_region}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={h.is_optional ? 'default' : 'info'} size="xs">
                          {h.is_optional ? 'Optional' : 'Mandatory'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="p-1.5 h-auto text-[#911D1D]"
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
        </div>
      )}

      {/* Leave Modal */}
      {isAddLeaveModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddLeaveModalOpen(false)}
          title="Record Planned Leave / Comp-Off"
          subtitle="Exclude employee from shift scheduling on the selected date"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitLeave} className="space-y-4">
            <Select
              label="Employee"
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
              placeholder="PLANNED_LEAVE"
            />

            <Input
              label="Reason (Optional)"
              value={leaveForm.reason || ''}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Medical appointment / personal leave"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
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

      {/* Holiday Modal */}
      {isAddHolidayModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddHolidayModalOpen(false)}
          title="Add Public Holiday"
          subtitle="Register a date evaluated by EXCEPT_PUBLIC_HOLIDAYS brand rules"
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
              placeholder="National holiday"
            />

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isOpt"
                checked={holidayForm.is_optional}
                onChange={(e) => setHolidayForm({ ...holidayForm, is_optional: e.target.checked })}
                className="rounded-[2px] border-[#B8B1A1]"
              />
              <label htmlFor="isOpt" className="text-xs text-[#1B1A17] font-medium cursor-pointer">
                Optional / Restricted Holiday
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
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
