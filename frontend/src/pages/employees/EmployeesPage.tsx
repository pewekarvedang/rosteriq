import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  Phone,
  Clock,
  Calendar,
  Layers,
  Building2,
} from 'lucide-react';

import { employeeService } from '../../services/employeeService';
import { podService } from '../../services/podService';
import { assignmentService } from '../../services/assignmentService';
import { availabilityService } from '../../services/availabilityService';
import { useToast } from '../../context/ToastContext';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  Pod,
  EmployeeAssignment,
  EmployeeAvailability,
} from '../../types';

export const EmployeesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPodId, setFilterPodId] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);

  // Detail drawer data
  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeAssignment[]>([]);
  const [employeeAvailabilities, setEmployeeAvailabilities] = useState<EmployeeAvailability[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Form states
  const [formData, setFormData] = useState<EmployeeCreate>({
    employee_code: '',
    full_name: '',
    email: '',
    phone: '',
    pod_id: null,
    max_weekly_hours: 40.0,
    max_daily_hours: 8.0,
    max_consecutive_days: 6,
    default_weekly_off_days: '6', // Sunday
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
    } catch (err: any) {
      showError('Failed to load employees', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Pod filter
      if (filterPodId !== 'all' && emp.pod_id !== Number(filterPodId)) return false;

      // Status filter
      if (filterStatus === 'active' && !emp.is_active) return false;
      if (filterStatus === 'inactive' && emp.is_active) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.full_name.toLowerCase().includes(q);
        const matchesCode = emp.employee_code.toLowerCase().includes(q);
        const matchesEmail = emp.email.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesEmail;
      }

      return true;
    });
  }, [employees, filterPodId, filterStatus, searchQuery]);

  // Open Add modal
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

  // Open Edit modal
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

  // Submit Add or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        const updated = await employeeService.update(editingEmployee.id, formData);
        setEmployees((prev) => prev.map((emp) => (emp.id === editingEmployee.id ? updated : emp)));
        showSuccess('Employee Updated', `${updated.full_name} has been updated.`);
        setEditingEmployee(null);
      } else {
        const created = await employeeService.create(formData);
        setEmployees((prev) => [...prev, created]);
        showSuccess('Employee Created', `${created.full_name} added to roster directory.`);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showError('Action failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (emp: Employee) => {
    try {
      const updated = await employeeService.update(emp.id, { is_active: !emp.is_active });
      setEmployees((prev) => prev.map((item) => (item.id === emp.id ? updated : item)));
      showSuccess(
        updated.is_active ? 'Employee Activated' : 'Employee Deactivated',
        `${emp.full_name} status updated.`
      );
    } catch (err: any) {
      showError('Status update failed', err.message);
    }
  };

  // View details
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
    } catch (err: any) {
      showError('Failed to load employee details', err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading employee workforce directory..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">EMPLOYEE DIRECTORY</h2>
            <Badge variant="info" size="xs">
              {employees.length} Personnel
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operational pod assignments, workload parameters, weekly-off configurations and availability
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, code, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>

          {/* Pod Filter */}
          <select
            value={filterPodId}
            onChange={(e) => setFilterPodId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Operational Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Showing {filteredEmployees.length} of {employees.length} employees
        </span>
      </div>

      {/* Employees Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Pod Assignment</th>
                <th className="px-4 py-3">Weekly Hours Limit</th>
                <th className="px-4 py-3">Daily Max</th>
                <th className="px-4 py-3">Preferred Off</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-400">{emp.employee_code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{emp.full_name}</div>
                      <div className="text-[11px] text-slate-500">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                        {emp.pod_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{emp.max_weekly_hours} hrs/wk</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{emp.max_daily_hours} hrs</td>
                    <td className="px-4 py-3 text-slate-400">
                      {emp.default_weekly_off_days === '6'
                        ? 'Sunday'
                        : emp.default_weekly_off_days === '0'
                        ? 'Monday'
                        : `Days [${emp.default_weekly_off_days}]`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={emp.is_active ? 'success' : 'default'} size="xs">
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(emp)}
                          className="p-1.5 h-auto text-slate-400 hover:text-slate-200"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 h-auto text-slate-400 hover:text-slate-200"
                          title="Edit Employee"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(emp)}
                          className={`p-1.5 h-auto ${
                            emp.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'
                          }`}
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
      </Card>

      {/* Add / Edit Employee Modal */}
      {(isAddModalOpen || editingEmployee) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEmployee(null);
          }}
          title={editingEmployee ? `Edit Employee - ${editingEmployee.full_name}` : 'Add New Employee'}
          subtitle="Configure employee workload limits, operational pod, and schedule policies"
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Employee Code"
                required
                value={formData.employee_code}
                onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                placeholder="EMP033"
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
                placeholder="aarav.s@datastraw.io"
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

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
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

      {/* View Employee Detail Drawer / Modal */}
      {viewingEmployee && (
        <Modal
          isOpen={true}
          onClose={() => setViewingEmployee(null)}
          title={viewingEmployee.full_name}
          subtitle={`${viewingEmployee.employee_code} &bull; Pod: ${viewingEmployee.pod_name || 'Unassigned'}`}
          maxWidth="lg"
          footer={
            <Button size="sm" variant="outline" onClick={() => setViewingEmployee(null)}>
              Close
            </Button>
          }
        >
          {isLoadingDetails ? (
            <LoadingSpinner message="Loading employee history & assignments..." />
          ) : (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Email</span>
                  <p className="text-slate-200 mt-0.5">{viewingEmployee.email}</p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Phone</span>
                  <p className="text-slate-200 mt-0.5">{viewingEmployee.phone || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Weekly Hours Cap</span>
                  <p className="text-slate-200 mt-0.5">{viewingEmployee.max_weekly_hours} hours</p>
                </div>
                <div>
                  <span className="text-slate-500 uppercase font-semibold">Max Consecutive Days</span>
                  <p className="text-slate-200 mt-0.5">{viewingEmployee.max_consecutive_days} days</p>
                </div>
              </div>

              {/* Brand & Process Assignments */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Brand & Process Roles ({employeeAssignments.length})
                </h4>
                {employeeAssignments.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 bg-slate-950 rounded-lg">No active brand roles assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {employeeAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{a.brand_name}</p>
                          <p className="text-indigo-400">{a.process_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.is_primary && (
                            <Badge variant="purple" size="xs">
                              Primary
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {a.start_date} &rarr; {a.end_date || 'Present'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduled Leaves / Comp-offs */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Availability Exceptions ({employeeAvailabilities.length})
                </h4>
                {employeeAvailabilities.length === 0 ? (
                  <p className="text-xs text-slate-500 p-3 bg-slate-950 rounded-lg">No leave or comp-offs recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {employeeAvailabilities.map((av) => (
                      <div
                        key={av.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{av.date}</p>
                          <p className="text-slate-400">{av.reason || av.leave_type || av.availability_type}</p>
                        </div>
                        <Badge variant={av.status === 'APPROVED' ? 'success' : 'warning'} size="xs">
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
