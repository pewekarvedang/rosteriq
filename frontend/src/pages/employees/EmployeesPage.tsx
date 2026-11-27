import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Edit,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';

import { employeeService } from '../../services/employeeService';
import { podService } from '../../services/podService';
import { assignmentService } from '../../services/assignmentService';
import { availabilityService } from '../../services/availabilityService';
import { useToast } from '../../context/ToastContext';

import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import {
  Employee,
  EmployeeCreate,
  Pod,
  EmployeeAssignment,
  EmployeeAvailability,
} from '../../types';

export const EmployeesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPodId, setFilterPodId] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeAssignment[]>([]);
  const [employeeAvailabilities, setEmployeeAvailabilities] = useState<EmployeeAvailability[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [formData, setFormData] = useState<EmployeeCreate>({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    pod_id: null,
    max_weekly_hours: 40.0,
    max_daily_hours: 8.0,
    max_consecutive_days: 6,
    default_weekly_off_days: '6',
    is_active: true,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, podList] = await Promise.all([
        employeeService.getAll(),
        podService.getAll(),
      ]);
      setEmployees(empList);
      setPods(podList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch employees';
      showError('Failed to load employees', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (filterPodId !== 'all' && emp.pod_id !== Number(filterPodId)) return false;
      if (filterStatus === 'active' && !emp.is_active) return false;
      if (filterStatus === 'inactive' && emp.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          emp.full_name.toLowerCase().includes(q) ||
          emp.employee_code.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, filterPodId, filterStatus, searchQuery]);

  const handleOpenAdd = () => {
    setFormData({
      employee_code: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      full_name: '',
      email: '',
      phone: '',
      pod_id: pods[0]?.id || null,
      max_weekly_hours: 40.0,
      max_daily_hours: 8.0,
      max_consecutive_days: 6,
      default_weekly_off_days: '6',
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      email: emp.email,
      phone: emp.phone || '',
      pod_id: emp.pod_id || null,
      max_weekly_hours: emp.max_weekly_hours,
      max_daily_hours: emp.max_daily_hours,
      max_consecutive_days: emp.max_consecutive_days,
      default_weekly_off_days: emp.default_weekly_off_days,
      is_active: emp.is_active,
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        const updated = await employeeService.update(editingEmployee.id, formData);
        setEmployees((prev) => prev.map((emp) => (emp.id === editingEmployee.id ? updated : emp)));
        showSuccess('Employee Updated', `${updated.full_name} saved.`);
        setEditingEmployee(null);
      } else {
        const created = await employeeService.create(formData);
        setEmployees((prev) => [...prev, created]);
        showSuccess('Employee Created', `${created.full_name} added to directory.`);
        setIsAddModalOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      showError('Action failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      const updated = await employeeService.update(emp.id, { is_active: !emp.is_active });
      setEmployees((prev) => prev.map((item) => (item.id === emp.id ? updated : item)));
      showSuccess(
        updated.is_active ? 'Employee Activated' : 'Employee Deactivated',
        `${emp.full_name} status updated.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      showError('Status update failed', message);
    }
  };

  const handleViewDetails = async (emp: Employee) => {
    setViewingEmployee(emp);
    setIsLoadingDetails(true);
    try {
      const [assigns, avails] = await Promise.all([
        assignmentService.getAll({ employee_id: emp.id }),
        availabilityService.getAll({ employee_id: emp.id }),
      ]);
      setEmployeeAssignments(assigns);
      setEmployeeAvailabilities(avails);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch records';
      showError('Failed to load employee details', message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading employee roster directory..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">EMPLOYEE DIRECTORY</h2>
            <Badge variant="default" size="xs">
              {employees.length} Staff
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Weekly hour caps, pod assignments, consecutive-day limits, and preferred off days.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FBF9F5] p-3 rounded-[4px] border border-[#D9D4C7]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#57534A] absolute left-3 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, code, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F6F3EC] border border-[#D9D4C7] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#1B1A17] placeholder-[#57534A]/70 w-64"
            />
          </div>

          <select
            value={filterPodId}
            onChange={(e) => setFilterPodId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-[#F6F3EC] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
          >
            <option value="all">All Operational Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="bg-[#F6F3EC] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <span className="font-mono text-xs text-[#57534A] tabular-nums">
          {filteredEmployees.length} / {employees.length} shown
        </span>
      </div>

      {/* Ruled Table */}
      <div className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1B1A17] border-collapse tabular-nums">
            <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name &amp; Email</th>
                <th className="px-4 py-3">Pod</th>
                <th className="px-4 py-3">Weekly Cap</th>
                <th className="px-4 py-3">Daily Max</th>
                <th className="px-4 py-3">Weekly Off</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#57534A]">
                    No employees found matching filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-semibold text-[#164B78]">{emp.employee_code}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-[#1B1A17]">{emp.full_name}</div>
                      <div className="text-[11px] text-[#57534A]">{emp.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-[2px] bg-[#F6F3EC] border border-[#D9D4C7] text-[#1B1A17] text-[11px]">
                        {emp.pod_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono">{emp.max_weekly_hours}h/wk</td>
                    <td className="px-4 py-2.5 font-mono">{emp.max_daily_hours}h</td>
                    <td className="px-4 py-2.5 text-[#57534A]">
                      {emp.default_weekly_off_days === '6'
                        ? 'Sunday'
                        : emp.default_weekly_off_days === '0'
                          ? 'Monday'
                          : `Days [${emp.default_weekly_off_days}]`}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={emp.is_active ? 'success' : 'default'} size="xs" dot>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(emp)}
                          className="p-1.5 h-auto"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 h-auto"
                          title="Edit Employee"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(emp)}
                          className={`p-1.5 h-auto ${emp.is_active ? 'text-[#911D1D]' : 'text-[#144836]'}`}
                          title={emp.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {emp.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingEmployee) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEmployee(null);
          }}
          title={editingEmployee ? `Edit Employee — ${editingEmployee.full_name}` : 'Add Employee'}
          subtitle="Set hour caps, pod unit, and preferred weekly off day"
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Employee Code"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                placeholder="EMP036"
              />
              <Input
                label="Full Name"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Aarav Sharma"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Work Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="aarav.s@company.com"
              />
              <Input
                label="Phone (Optional)"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91-9876543210"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Operational Pod"
                value={formData.pod_id || ''}
                onChange={(e) => setFormData({ ...formData, pod_id: e.target.value ? Number(e.target.value) : null })}
                options={[
                  { value: '', label: 'No Pod Assigned' },
                  ...pods.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
                ]}
              />
              <Select
                label="Preferred Weekly Off"
                value={formData.default_weekly_off_days}
                onChange={(e) => setFormData({ ...formData, default_weekly_off_days: e.target.value })}
                options={[
                  { value: '6', label: 'Sunday' },
                  { value: '5', label: 'Saturday' },
                  { value: '0', label: 'Monday' },
                  { value: '5,6', label: 'Saturday & Sunday' },
                  { value: '0,6', label: 'Sunday & Monday' },
                ]}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Max Weekly Hours"
                type="number"
                step="1"
                min="10"
                max="80"
                required
                value={formData.max_weekly_hours}
                onChange={(e) => setFormData({ ...formData, max_weekly_hours: Number(e.target.value) })}
              />
              <Input
                label="Max Daily Hours"
                type="number"
                step="1"
                min="4"
                max="16"
                required
                value={formData.max_daily_hours}
                onChange={(e) => setFormData({ ...formData, max_daily_hours: Number(e.target.value) })}
              />
              <Input
                label="Max Consecutive Days"
                type="number"
                min="3"
                max="12"
                required
                value={formData.max_consecutive_days}
                onChange={(e) => setFormData({ ...formData, max_consecutive_days: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEmployee(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingEmployee ? 'Save Changes' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Employee Details Modal */}
      {viewingEmployee && (
        <Modal
          isOpen={true}
          onClose={() => setViewingEmployee(null)}
          title={viewingEmployee.full_name}
          subtitle={`${viewingEmployee.employee_code} · Pod: ${viewingEmployee.pod_name || 'Unassigned'}`}
          maxWidth="lg"
          footer={
            <Button size="sm" variant="outline" onClick={() => setViewingEmployee(null)}>
              Close
            </Button>
          }
        >
          {isLoadingDetails ? (
            <LoadingSpinner message="Loading assigned roles and leave records..." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-[4px] bg-[#F6F3EC] border border-[#D9D4C7] text-xs tabular-nums">
                <div>
                  <span className="font-mono text-[#57534A] uppercase text-[10px]">Email</span>
                  <p className="text-[#1B1A17] mt-0.5">{viewingEmployee.email}</p>
                </div>
                <div>
                  <span className="font-mono text-[#57534A] uppercase text-[10px]">Phone</span>
                  <p className="text-[#1B1A17] mt-0.5">{viewingEmployee.phone || '—'}</p>
                </div>
                <div>
                  <span className="font-mono text-[#57534A] uppercase text-[10px]">Weekly Cap</span>
                  <p className="font-mono font-semibold text-[#1B1A17] mt-0.5">{viewingEmployee.max_weekly_hours}h</p>
                </div>
                <div>
                  <span className="font-mono text-[#57534A] uppercase text-[10px]">Max Consecutive</span>
                  <p className="font-mono font-semibold text-[#1B1A17] mt-0.5">{viewingEmployee.max_consecutive_days} days</p>
                </div>
              </div>

              <div>
                <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A] mb-2">
                  Brand &amp; Process Roles ({employeeAssignments.length})
                </h4>
                {employeeAssignments.length === 0 ? (
                  <p className="text-xs text-[#57534A] p-3 border border-[#D9D4C7] rounded-[4px]">
                    No active brand roles assigned.
                  </p>
                ) : (
                  <div className="divide-y divide-[#D9D4C7] border border-[#D9D4C7] rounded-[4px]">
                    {employeeAssignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-2.5 text-xs">
                        <div>
                          <p className="font-semibold text-[#1B1A17]">{a.brand_name}</p>
                          <p className="text-[#164B78]">{a.process_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.is_primary && (
                            <Badge variant="info" size="xs">
                              Primary
                            </Badge>
                          )}
                          <span className="text-[11px] text-[#57534A] font-mono">
                            {a.start_date} &rarr; {a.end_date || 'Present'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A] mb-2">
                  Leave &amp; Unavailability ({employeeAvailabilities.length})
                </h4>
                {employeeAvailabilities.length === 0 ? (
                  <p className="text-xs text-[#57534A] p-3 border border-[#D9D4C7] rounded-[4px]">
                    No leave or comp-offs recorded.
                  </p>
                ) : (
                  <div className="divide-y divide-[#D9D4C7] border border-[#D9D4C7] rounded-[4px]">
                    {employeeAvailabilities.map((av) => (
                      <div key={av.id} className="flex items-center justify-between p-2.5 text-xs">
                        <div>
                          <p className="font-mono font-semibold text-[#1B1A17]">{av.date}</p>
                          <p className="text-[#57534A]">{av.reason || av.leave_type || av.availability_type}</p>
                        </div>
                        <Badge variant={av.status === 'APPROVED' ? 'success' : 'warning'} size="xs" dot>
                          {av.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
