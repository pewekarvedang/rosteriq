import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { assignmentService } from '../../services/assignmentService';
import { employeeService } from '../../services/employeeService';
import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';
import { useToast } from '../../context/ToastContext';

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

  const [filterBrandId, setFilterBrandId] = useState<number | 'all'>('all');
  const [filterProcessId, setFilterProcessId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<EmployeeAssignment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch assignments';
      showError('Failed to load employee assignments', message);
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
        showSuccess('Assignment Updated', 'Staff role mapping saved.');
        setEditingAssignment(null);
      } else {
        const created = await assignmentService.create(formData);
        setAssignments((prev) => [...prev, created]);
        showSuccess('Assignment Created', 'Employee mapped to brand and process.');
        setIsAddModalOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      showError('Assignment update failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm('Remove this employee brand-process assignment?')) return;
    try {
      await assignmentService.delete(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      showSuccess('Assignment Removed', 'Role mapping deleted.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      showError('Deletion failed', message);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (filterBrandId !== 'all' && a.brand_id !== Number(filterBrandId)) return false;
      if (filterProcessId !== 'all' && a.process_id !== Number(filterProcessId)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          Boolean(a.employee_name?.toLowerCase().includes(q)) ||
          Boolean(a.brand_name?.toLowerCase().includes(q)) ||
          Boolean(a.process_name?.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [assignments, filterBrandId, filterProcessId, searchQuery]);

  if (isLoading) {
    return <LoadingSpinner message="Loading employee role assignments..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">EMPLOYEE ROLE ASSIGNMENTS</h2>
            <Badge variant="default" size="xs">
              {assignments.length} Mappings
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Eligible employee-to-brand and process pairings used by the shift solver.
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FBF9F5] p-3 rounded-[4px] border border-[#D9D4C7]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#57534A] absolute left-3 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, brand, process..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#F6F3EC] border border-[#D9D4C7] rounded-[4px] pl-8 pr-3 py-1.5 text-xs text-[#1B1A17] placeholder-[#57534A]/70 w-64"
            />
          </div>

          <select
            value={filterBrandId}
            onChange={(e) => setFilterBrandId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-[#F6F3EC] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
          >
            <option value="all">All Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={filterProcessId}
            onChange={(e) => setFilterProcessId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-[#F6F3EC] border border-[#D9D4C7] rounded-[4px] px-3 py-1.5 text-xs text-[#1B1A17]"
          >
            <option value="all">All Processes ({processes.length})</option>
            {processes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <span className="font-mono text-xs text-[#57534A] tabular-nums">
          {filteredAssignments.length} / {assignments.length} mappings
        </span>
      </div>

      {/* Ruled Table */}
      <div className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse tabular-nums">
            <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Client Brand</th>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3">Effective Dates</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#57534A]">
                    No role assignments match the filters.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-[#1B1A17]">
                      {a.employee_name || `Employee #${a.employee_id}`}
                    </td>
                    <td className="px-4 py-2.5 text-[#1B1A17]">{a.brand_name}</td>
                    <td className="px-4 py-2.5 text-[#164B78] font-medium">{a.process_name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={a.is_primary ? 'info' : 'default'} size="xs">
                        {a.is_primary ? 'Primary' : 'Secondary'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#57534A] text-[11px]">
                      {a.start_date} &rarr; {a.end_date || 'Present'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant={a.is_active ? 'success' : 'default'} size="xs" dot>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(a)}
                          className="p-1.5 h-auto"
                          title="Edit Assignment"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="p-1.5 h-auto text-[#911D1D]"
                          title="Remove Assignment"
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
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingAssignment) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingAssignment(null);
          }}
          title={editingAssignment ? 'Edit Role Assignment' : 'Assign Employee'}
          subtitle="Map an employee to a client brand and process queue"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingAssignment && (
              <Select
                label="Employee"
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
                label="Start Date"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <Input
                label="End Date (Optional)"
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
                className="rounded-[2px] border-[#B8B1A1]"
              />
              <label htmlFor="isPrimary" className="text-xs text-[#1B1A17] font-medium cursor-pointer">
                Designate as Primary Role Assignment
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
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
