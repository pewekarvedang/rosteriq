import React, { useState, useEffect, useMemo } from 'react';
import {
  Network,
  Plus,
  Users,
  UserCheck,
  Edit,
  Trash2,
  ChevronRight,
  Shield,
  Search,
} from 'lucide-react';

import { podService } from '../../services/podService';
import { employeeService } from '../../services/employeeService';
import { useToast } from '../../context/ToastContext';

import { Card, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import { Pod, PodCreate, PodUpdate, Employee } from '../../types';

export const PodsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pods, setPods] = useState<Pod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [viewingPod, setViewingPod] = useState<Pod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form data
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
    } catch (err: any) {
      showError('Failed to load pods', err.message);
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
        showSuccess('Pod Updated', `${updated.name} updated successfully.`);
        setEditingPod(null);
      } else {
        const created = await podService.create(formData);
        setPods((prev) => [...prev, created]);
        showSuccess('Pod Created', `${created.name} added to roster configuration.`);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showError('Failed to save pod', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get members belonging to viewing pod
  const podMembers = useMemo(() => {
    if (!viewingPod) return [];
    return employees.filter((e) => e.pod_id === viewingPod.id);
  }, [viewingPod, employees]);

  if (isLoading) {
    return <LoadingSpinner message="Loading operational pod structures..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">OPERATIONAL PODS</h2>
            <Badge variant="purple" size="xs">
              {pods.length} Pod Units
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous operational units, designated pod leads, and member distribution
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

      {/* Pod Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {pods.map((pod) => {
          const membersCount = employees.filter((e) => e.pod_id === pod.id).length;
          return (
            <Card
              key={pod.id}
              hoverEffect
              onClick={() => setViewingPod(pod)}
              className="p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-950/70 border border-purple-800/40 text-purple-300 flex items-center justify-center font-bold text-sm">
                    {pod.code.split('-')[1] || pod.code.substring(0, 2)}
                  </div>
                  <Badge variant={pod.is_active ? 'success' : 'default'} size="xs">
                    {pod.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-100 tracking-tight">{pod.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {pod.description || 'Dedicated multi-brand operational workforce unit'}
                </p>

                {/* Lead info */}
                <div className="mt-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Pod Lead</span>
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {pod.lead_name || 'Unassigned'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <strong>{membersCount}</strong> Members
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(pod)}
                    className="p-1 h-auto text-slate-400 hover:text-slate-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Pod Modal */}
      {(isAddModalOpen || editingPod) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingPod(null);
          }}
          title={editingPod ? `Edit Pod - ${editingPod.name}` : 'Create Operational Pod'}
          subtitle="Define pod parameters and appoint a designated team lead"
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
              placeholder="Primary handling pod for enterprise brands"
            />

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
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

      {/* View Pod Members Modal */}
      {viewingPod && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPod(null)}
          title={viewingPod.name}
          subtitle={`Lead: ${viewingPod.lead_name || 'None'} &bull; ${podMembers.length} Members Assigned`}
          maxWidth="lg"
          footer={
            <Button size="sm" variant="outline" onClick={() => setViewingPod(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Assigned Personnel
            </h4>

            {podMembers.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 bg-slate-950 rounded-lg text-center">
                No employees are currently assigned to this pod.
              </p>
            ) : (
              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {podMembers.map((emp) => (
                  <div key={emp.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">
                        {emp.full_name}
                        {emp.id === viewingPod.lead_id && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800/40">
                            Lead
                          </span>
                        )}
                      </p>
                      <p className="text-slate-500 font-mono text-[11px]">{emp.employee_code} &bull; {emp.email}</p>
                    </div>
                    <Badge variant={emp.is_active ? 'success' : 'default'} size="xs">
                      {emp.max_weekly_hours} hrs/wk
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
