import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Headphones,
  ShoppingCart,
  RotateCcw,
  Truck,
  Sparkles,
} from 'lucide-react';

import { processService } from '../../services/processService';
import { brandService } from '../../services/brandService';
import { useToast } from '../../context/ToastContext';

import { Card } from '../../components/common/Card';
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

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form
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
    } catch (err: any) {
      showError('Failed to load processes', err.message);
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
        showSuccess('Process Updated', `${updated.name} updated.`);
        setEditingProcess(null);
      } else {
        const created = await processService.create(formData);
        setProcesses((prev) => [...prev, created]);
        showSuccess('Process Created', `${created.name} registered.`);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showError('Failed to save process', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProcessIcon = (code: string) => {
    switch (code) {
      case 'CS':
        return <Headphones className="w-5 h-5 text-indigo-400" />;
      case 'ACC':
        return <ShoppingCart className="w-5 h-5 text-amber-400" />;
      case 'RET':
      case 'RETENTION':
        return <RotateCcw className="w-5 h-5 text-teal-400" />;
      case 'NDR':
        return <Truck className="w-5 h-5 text-rose-400" />;
      default:
        return <Layers className="w-5 h-5 text-purple-400" />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading business processes..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">OPERATIONAL PROCESSES</h2>
            <Badge variant="purple" size="xs">
              {processes.length} Processes
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customer Support, Abandoned Cart Conversions, Retention, Non-Delivery Report Management & VIP Workflows
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

      {/* Process Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {processes.map((proc) => {
          const linkedBrandCount = brandProcesses.filter((bp) => bp.process_id === proc.id).length;
          return (
            <Card key={proc.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    {getProcessIcon(proc.code)}
                  </div>
                  <Badge variant={proc.is_active ? 'success' : 'default'} size="xs">
                    {proc.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-100 tracking-tight">{proc.name}</h3>
                <p className="text-xs text-indigo-400 font-mono mt-0.5">{proc.code}</p>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                  {proc.description || 'Core customer lifecycle operational workflow'}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <strong>{linkedBrandCount}</strong> Brands Operating
                </span>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenEdit(proc)}
                  className="p-1 h-auto text-slate-400 hover:text-slate-200"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Process Modal */}
      {(isAddModalOpen || editingProcess) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProcess(null);
          }}
          title={editingProcess ? `Edit Process - ${editingProcess.name}` : 'Create Business Process'}
          subtitle="Configure business workflow code and operational specifications"
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
              placeholder="Inbound customer service, tickets and inquiries"
            />

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
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
