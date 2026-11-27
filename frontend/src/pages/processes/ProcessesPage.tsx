import React, { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { processService } from '../../services/processService';
import { brandService } from '../../services/brandService';
import { useToast } from '../../context/ToastContext';

import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Process, ProcessCreate, BrandProcess } from '../../types';

export const ProcessesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [brandProcesses, setBrandProcesses] = useState<BrandProcess[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [formData, setFormData] = useState<ProcessCreate>({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pList, bpList] = await Promise.all([
        processService.getAll(),
        brandService.getBrandProcesses(),
      ]);
      setProcesses(pList);
      setBrandProcesses(bpList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch processes';
      showError('Failed to load processes', message);
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
      code: '',
      description: '',
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Process) => {
    setEditingProcess(p);
    setFormData({
      name: p.name,
      code: p.code,
      description: p.description || '',
      is_active: p.is_active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProcess) {
        const updated = await processService.update(editingProcess.id, formData);
        setProcesses((prev) => prev.map((item) => (item.id === editingProcess.id ? updated : item)));
        showSuccess('Process Updated', `${updated.name} saved.`);
        setEditingProcess(null);
      } else {
        const created = await processService.create(formData);
        setProcesses((prev) => [...prev, created]);
        showSuccess('Process Created', `${created.name} added.`);
        setIsAddModalOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      showError('Failed to save process', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading business processes..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">OPERATIONAL PROCESSES</h2>
            <Badge variant="default" size="xs">
              {processes.length} Queues
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Customer Support, Abandoned Cart Conversions, Retention, NDR, and VIP queue types.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Process
        </Button>
      </div>

      <div className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse tabular-nums">
            <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Process Name</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3 text-center">Linked Brands</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {processes.map((proc) => {
                const linkedBrandCount = brandProcesses.filter((bp) => bp.process_id === proc.id).length;
                return (
                  <tr key={proc.id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-[#164B78]">{proc.code}</td>
                    <td className="px-4 py-3 font-semibold text-[#1B1A17]">{proc.name}</td>
                    <td className="px-4 py-3 text-[#57534A]">
                      {proc.description || 'Operational customer service queue'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-[#1B1A17]">
                      {linkedBrandCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={proc.is_active ? 'success' : 'default'} size="xs" dot>
                        {proc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(proc)}
                        className="p-1.5 h-auto"
                        title="Edit Process"
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

      {(isAddModalOpen || editingProcess) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProcess(null);
          }}
          title={editingProcess ? `Edit Process — ${editingProcess.name}` : 'Create Process'}
          subtitle="Define queue code and scope"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Process Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer Support"
              />
              <Input
                label="Process Code"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="CS"
              />
            </div>

            <Input
              label="Description (Optional)"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Inbound tickets, live chat, and voice"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProcess(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingProcess ? 'Save Changes' : 'Create Process'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
