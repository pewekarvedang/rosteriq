import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Building2,
  Layers,
  Users,
  Calendar,
} from 'lucide-react';

import { assignmentService } from '../../services/assignmentService';
import { employeeService } from '../../services/employeeService';
import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';
import { useToast } from '../../context/ToastContext';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import {
  EmployeeAssignment,
  EmployeeAssignmentCreate,
  Employee,
  Brand,
  Process,
} from '../../types';

export const AssignmentsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  // Filters
  const [filterBrandId, setFilterBrandId] = useState<number | 'all'>('all');
  const [filterProcessId, setFilterProcessId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAssignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form
  const [formData, setFormData] = useState<EmployeeAssignmentCreate>({
    employee_id: 0,
    brand_id: 0,
    process_id: 0,
    is_primary: true,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    is_active: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [aList, eList, bList, pList] = await Promise.all([
        assignmentService.getAll(),
        employeeService.getAll(),
        brandService.getAll(),
        processService.getAll(),
      ]);
      setAssignments(aList);
      setEmployees(eList);
      setBrands(bList);
      setProcesses(pList);
    } catch (err: any) {
      showError('Failed to load employee assignments', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      employee_id: employees[0]?.id || 1,
      brand_id: brands[0]?.id || 1,
      process_id: processes[0]?.id || 1,
      is_primary: true,
      start_date: '2026-01-01',
      end_date: null,
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (a: EmployeeAssignment) => {
    setEditingAssignment(a);
    setFormData({
      employee_id: a.employee_id,
      brand_id: a.brand_id,
      process_id: a.process_id,
      is_primary: a.is_primary,
      start_date: a.start_date,
      end_date: a.end_date || null,
      is_active: a.is_active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAssignment) {
        const updated = await assignmentService.update(editingAssignment.id, {
          is_primary: formData.is_primary,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_active: formData.is_active,
        });
        setAssignments((prev) => prev.map((item) => (item.id === editingAssignment.id ? updated : item)));
        showSuccess('Assignment Updated', 'Employee role assignment saved.');
        setEditingAssignment(null);
      } else {
        const created = await assignmentService.create(formData);
        setAssignments((prev) => [...prev, created]);
        showSuccess('Assignment Created', 'Employee successfully mapped to brand process.');
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showError('Assignment update failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('Are you sure you want to remove this employee brand-process assignment?')) return;
    try {
      await assignmentService.delete(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Assignment Removed', 'Employee role mapping deleted.');
    } catch (err: any) {
      showError('Deletion failed', err.message);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterBrandId !== 'all' && a.brand_id !== Number(filterBrandId)) return false;
      if (filterProcessId !== 'all' && a.process_id !== Number(filterProcessId)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEmp = a.employee_name?.toLowerCase().includes(q);
        const matchesBrand = a.brand_name?.toLowerCase().includes(q);
        const matchesProc = a.process_name?.toLowerCase().includes(q);
        return matchesEmp || matchesBrand || matchesProc;
      }
      return true;
    });
  }, [assignments, filterBrandId, filterProcessId, searchQuery]);

  if (isLoading) {
    return <LoadingSpinner message="Loading employee brand-process assignments..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">EMPLOYEE ROLE ASSIGNMENTS</h2>
            <Badge variant="info" size="xs">
              {assignments.length} Mappings
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Map employees to multiple brands and processes with primary/secondary designations and date validity
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Assign Employee
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
              placeholder="Search employee, brand, process..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Process Filter */}
          <select
            value={filterProcessId}
            onChange={(e) => setFilterProcessId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Processes ({processes.length})</option>
            {processes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Showing {filteredAssignments.length} of {assignments.length} assignments
        </span>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Client Brand</th>
                <th className="px-4 py-3">Business Process</th>
                <th className="px-4 py-3 text-center">Designation</th>
                <th className="px-4 py-3">Validity Period</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No role assignments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      {a.employee_name || `Employee #${a.employee_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{a.brand_name}</td>
                    <td className="px-4 py-3 text-indigo-400 font-medium">{a.process_name}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={a.is_primary ? 'purple' : 'default'} size="xs">
                        {a.is_primary ? 'Primary' : 'Secondary'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {a.start_date} &rarr; {a.end_date || 'Present'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={a.is_active ? 'success' : 'default'} size="xs">
                        {a.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(a)}
                          className="p-1.5 h-auto text-slate-400 hover:text-slate-200"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="p-1.5 h-auto text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Assignment Modal */}
      {(isAddModalOpen || editingAssignment) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingAssignment(null);
          }}
          title={editingAssignment ? 'Edit Role Assignment' : 'Assign Employee to Brand & Process'}
          subtitle="Configure multi-brand and multi-process handling eligibility"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingAssignment && (
              <Select
                label="Select Employee"
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: Number(e.target.value) })}
                options={employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` }))}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Client Brand"
                required
                disabled={!!editingAssignment}
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: Number(e.target.value) })}
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
              />
              <Select
                label="Business Process"
                required
                disabled={!!editingAssignment}
                value={formData.process_id}
                onChange={(e) => setFormData({ ...formData, process_id: Number(e.target.value) })}
                options={processes.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Assignment Start Date"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <Input
                label="Assignment End Date (Optional)"
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.is_primary}
                onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isPrimary" className="text-xs text-slate-300 font-medium cursor-pointer">
                Designate as Primary Role Assignment
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingAssignment(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingAssignment ? 'Save Changes' : 'Create Assignment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
