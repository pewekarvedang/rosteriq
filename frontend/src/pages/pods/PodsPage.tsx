import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit } from 'lucide-react';
import { podService } from '../../services/podService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../../context/ToastContext';

import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Pod, PodCreate, Employee } from '../../types';

export const PodsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pods, setPods] = useState<Pod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [selectedPodId, setSelectedPodId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState<PodCreate>({
    name: '',
    code: '',
    description: '',
    lead_id: null,
    is_active: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [podList, empList] = await Promise.all([
        podService.getAll(),
        employeeService.getAll(),
      ]);
      setPods(podList);
      setEmployees(empList);
      if (podList.length > 0 && selectedPodId === null) {
        setSelectedPodId(podList[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch pods';
      showError('Failed to load pods', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: `POD-${String.fromCharCode(65 + pods.length)}`,
      description: '',
      lead_id: null,
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (pod: Pod) => {
    setEditingPod(pod);
    setFormData({
      name: pod.name,
      code: pod.code,
      description: pod.description || '',
      lead_id: pod.lead_id || null,
      is_active: pod.is_active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPod) {
        const updated = await podService.update(editingPod.id, formData);
        setPods((prev) => prev.map((p) => (p.id === editingPod.id ? updated : p)));
        showSuccess('Pod Updated', `${updated.name} saved.`);
        setEditingPod(null);
      } else {
        const created = await podService.create(formData);
        setPods((prev) => [...prev, created]);
        setSelectedPodId(created.id);
        showSuccess('Pod Created', `${created.name} added.`);
        setIsAddModalOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save pod';
      showError('Failed to save pod', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPod = useMemo(
    () => pods.find((p) => p.id === selectedPodId) || pods[0] || null,
    [pods, selectedPodId]
  );

  const podMembers = useMemo(() => {
    if (!selectedPod) return [];
    return employees.filter((e) => e.pod_id === selectedPod.id);
  }, [selectedPod, employees]);

  if (isLoading) {
    return <LoadingSpinner message="Loading operational pods..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">OPERATIONAL PODS</h2>
            <Badge variant="default" size="xs">
              {pods.length} Units
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Staff groupings, pod leads, and assigned headcount capacity.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Create Pod
        </Button>
      </div>

      {/* Asymmetric Split: Ruled Pod List (7 cols) + Selected Pod Roster (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Pod Name</th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3 text-center">Staff</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {pods.map((pod) => {
                  const membersCount = employees.filter((e) => e.pod_id === pod.id).length;
                  const isSelected = selectedPod?.id === pod.id;
                  return (
                    <tr
                      key={pod.id}
                      onClick={() => setSelectedPodId(pod.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#EDE8DC]' : 'hover:bg-[#EDE8DC]/40'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-[#164B78]">{pod.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#1B1A17]">{pod.name}</div>
                        <div className="text-[11px] text-[#57534A]">{pod.description}</div>
                      </td>
                      <td className="px-4 py-3 text-[#1B1A17]">{pod.lead_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-[#1B1A17]">{membersCount}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={pod.is_active ? 'success' : 'default'} size="xs" dot>
                          {pod.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(pod)}
                          className="p-1.5 h-auto"
                          title="Edit Pod"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Pod Member Roster */}
        <aside className="lg:col-span-5 border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px]">
          {selectedPod ? (
            <>
              <div className="px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC] flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1B1A17]">{selectedPod.name}</h3>
                  <p className="font-mono text-[11px] text-[#57534A]">
                    Lead: {selectedPod.lead_name || 'None'} &middot; {podMembers.length} staff
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenEdit(selectedPod)}>
                  Edit Pod
                </Button>
              </div>

              {podMembers.length === 0 ? (
                <p className="p-6 text-xs text-[#57534A]">No staff currently placed in this pod.</p>
              ) : (
                <div className="divide-y divide-[#D9D4C7] max-h-[480px] overflow-y-auto">
                  {podMembers.map((emp) => (
                    <div key={emp.id} className="px-4 py-2.5 flex items-center justify-between text-xs tabular-nums">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1B1A17] truncate">
                          {emp.full_name}
                          {emp.id === selectedPod.lead_id && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono bg-[#FBF1DC] text-[#784300] border border-[#D9AD5B]">
                              Lead
                            </span>
                          )}
                        </p>
                        <p className="text-[#57534A] font-mono text-[11px] truncate">
                          {emp.employee_code} &middot; {emp.email}
                        </p>
                      </div>
                      <Badge variant={emp.is_active ? 'success' : 'default'} size="xs">
                        {emp.max_weekly_hours}h/wk
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="p-6 text-xs text-[#57534A]">Select a pod row to inspect its roster.</p>
          )}
        </aside>
      </div>

      {/* Add / Edit Pod Modal */}
      {(isAddModalOpen || editingPod) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingPod(null);
          }}
          title={editingPod ? `Edit Pod — ${editingPod.name}` : 'Create Operational Pod'}
          subtitle="Assign pod code and designated team lead"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Pod Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Pod Alpha"
              />
              <Input
                label="Pod Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="POD-ALPHA"
              />
            </div>

            <Select
              label="Designated Pod Lead"
              value={formData.lead_id || ''}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value ? Number(e.target.value) : null })}
              options={[
                { value: '', label: 'Select Pod Lead (Optional)' },
                ...employees.map((e) => ({ value: e.id, label: `${e.full_name} (${e.employee_code})` })),
              ]}
            />

            <Input
              label="Description (Optional)"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Primary brand support pod"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingPod(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingPod ? 'Save Changes' : 'Create Pod'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
