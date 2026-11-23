import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Users,
  Eye,
  Settings2,
} from 'lucide-react';

import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';
import { assignmentService } from '../../services/assignmentService';
import { useToast } from '../../context/ToastContext';

import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

import {
  Brand,
  BrandCreate,
  BrandProcess,
  BrandProcessCreate,
  Process,
  OperatingCalendarRule,
  EmployeeAssignment,
} from '../../types';

export const BrandsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [brandProcesses, setBrandProcesses] = useState<BrandProcess[]>([]);

  // Modals state
  const [isAddBrandOpen, setIsAddBrandOpen] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [viewingBrand, setViewingBrand] = useState<Brand | null>(null);
  const [isAddProcessModalOpen, setIsAddProcessModalOpen] = useState<boolean>(false);

  // Assigned employees for viewing brand
  const [brandEmployees, setBrandEmployees] = useState<EmployeeAssignment[]>([]);

  // Brand Form
  const [brandFormData, setBrandFormData] = useState<BrandCreate>({
    name: '',
    code: '',
    client_name: '',
    description: '',
    is_active: true,
  });

  // Add BrandProcess Form
  const [processFormData, setProcessFormData] = useState<BrandProcessCreate>({
    brand_id: 0,
    process_id: 0,
    operating_calendar: 'EVERYDAY',
    custom_operating_days: '0,1,2,3,4',
    min_headcount_per_shift: 1,
    requires_24_7: false,
    is_active: true,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bList, pList, bpList] = await Promise.all([
        brandService.getAll(),
        processService.getAll(),
        brandService.getBrandProcesses(),
      ]);
      setBrands(bList);
      setProcesses(pList);
      setBrandProcesses(bpList);
    } catch (err: any) {
      showError('Failed to load brands', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Add Brand Modal
  const handleOpenAddBrand = () => {
    setBrandFormData({
      name: '',
      code: '',
      client_name: '',
      description: '',
      is_active: true,
    });
    setIsAddBrandOpen(true);
  };

  // Open Edit Brand Modal
  const handleOpenEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandFormData({
      name: b.name,
      code: b.code,
      client_name: b.client_name || '',
      description: b.description || '',
      is_active: b.is_active,
    });
  };

  // Submit Brand
  const handleSubmitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBrand) {
        const updated = await brandService.update(editingBrand.id, brandFormData);
        setBrands((prev) => prev.map((b) => (b.id === editingBrand.id ? updated : b)));
        showSuccess('Brand Updated', `${updated.name} updated successfully.`);
        setEditingBrand(null);
      } else {
        const created = await brandService.create(brandFormData);
        setBrands((prev) => [...prev, created]);
        showSuccess('Brand Created', `${created.name} registered.`);
        setIsAddBrandOpen(false);
      }
    } catch (err: any) {
      showError('Failed to save brand', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open View Brand Drawer
  const handleViewBrand = async (b: Brand) => {
    setViewingBrand(b);
    try {
      const assigns = await assignmentService.getAll({ brand_id: b.id });
      setBrandEmployees(assigns);
    } catch (err: any) {
      showError('Failed to load brand employees', err.message);
    }
  };

  // Open Add Process to Brand Modal
  const handleOpenAddProcess = (brandId: number) => {
    setProcessFormData({
      brand_id: brandId,
      process_id: processes[0]?.id || 1,
      operating_calendar: 'EVERYDAY',
      custom_operating_days: '0,1,2,3,4',
      min_headcount_per_shift: 1,
      requires_24_7: false,
      is_active: true,
    });
    setIsAddProcessModalOpen(true);
  };

  // Submit Brand Process
  const handleSubmitBrandProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await brandService.createBrandProcess(processFormData);
      setBrandProcesses((prev) => [...prev, created]);
      showSuccess('Process Linked to Brand', 'Operating calendar and headcount rules configured.');
      setIsAddProcessModalOpen(false);
      // Reload brand processes
      const bpList = await brandService.getBrandProcesses();
      setBrandProcesses(bpList);
    } catch (err: any) {
      showError('Failed to link process', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading client brands and operating calendars..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">CLIENT BRANDS MANAGEMENT</h2>
            <Badge variant="info" size="xs">
              {brands.length} Brands
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise clients, associated operational processes, and independent operating calendars
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenAddBrand}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Client Brand
        </Button>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {brands.map((b) => {
          const procs = brandProcesses.filter((bp) => bp.brand_id === b.id);
          return (
            <Card
              key={b.id}
              hoverEffect
              onClick={() => handleViewBrand(b)}
              className="p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800/40 text-indigo-300 flex items-center justify-center font-bold text-sm">
                    {b.code.substring(0, 3)}
                  </div>
                  <Badge variant={b.is_active ? 'success' : 'default'} size="xs">
                    {b.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <h3 className="text-base font-bold text-slate-100 tracking-tight">{b.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{b.code}</p>
                {b.client_name && (
                  <p className="text-xs text-slate-500 mt-1">Client: {b.client_name}</p>
                )}

                {/* Operating Processes Badge list */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Operating Processes ({procs.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {procs.length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">No processes configured</span>
                    ) : (
                      procs.map((bp) => (
                        <span
                          key={bp.id}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-indigo-300"
                        >
                          {bp.process_name} ({bp.min_headcount_per_shift}/shift)
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <strong>{b.assigned_employee_count || 3}</strong> Staff Assigned
                </span>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenAddProcess(b.id)}
                    className="p-1 h-auto text-indigo-400 hover:text-indigo-300 text-xs"
                    title="Add Process"
                  >
                    + Process
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEditBrand(b)}
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

      {/* Add / Edit Brand Modal */}
      {(isAddBrandOpen || editingBrand) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddBrandOpen(false);
            setEditingBrand(null);
          }}
          title={editingBrand ? `Edit Brand - ${editingBrand.name}` : 'Add Client Brand'}
          subtitle="Configure client brand identifier and enterprise profile"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitBrand} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Brand Name"
                required
                value={brandFormData.name}
                onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
                placeholder="BellaVita Organic"
              />
              <Input
                label="Brand Code"
                required
                value={brandFormData.code}
                onChange={(e) => setBrandFormData({ ...brandFormData, code: e.target.value })}
                placeholder="BELLAVITA"
              />
            </div>

            <Input
              label="Client Legal Entity (Optional)"
              value={brandFormData.client_name || ''}
              onChange={(e) => setBrandFormData({ ...brandFormData, client_name: e.target.value })}
              placeholder="Bella Vita Ltd."
            />

            <Input
              label="Description (Optional)"
              value={brandFormData.description || ''}
              onChange={(e) => setBrandFormData({ ...brandFormData, description: e.target.value })}
              placeholder="Omnichannel D2C enterprise client"
            />

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddBrandOpen(false);
                  setEditingBrand(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingBrand ? 'Save Changes' : 'Create Brand'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Process to Brand Modal */}
      {isAddProcessModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddProcessModalOpen(false)}
          title="Configure Brand Process"
          subtitle="Define operating calendar rules and minimum staffing requirements"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitBrandProcess} className="space-y-4">
            <Select
              label="Business Process"
              required
              value={processFormData.process_id}
              onChange={(e) => setProcessFormData({ ...processFormData, process_id: Number(e.target.value) })}
              options={processes.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
            />

            <Select
              label="Operating Calendar Rule"
              required
              value={processFormData.operating_calendar}
              onChange={(e) =>
                setProcessFormData({ ...processFormData, operating_calendar: e.target.value as OperatingCalendarRule })
              }
              options={[
                { value: 'EVERYDAY', label: 'EVERYDAY (7 Days, All Holidays)' },
                { value: 'EXCEPT_PUBLIC_HOLIDAYS', label: 'EXCEPT_PUBLIC_HOLIDAYS (All days except holidays)' },
                { value: 'EXCEPT_SUNDAYS_AND_HOLIDAYS', label: 'EXCEPT_SUNDAYS_AND_HOLIDAYS (Mon-Sat, no holidays)' },
                { value: 'CUSTOM', label: 'CUSTOM (Configured days)' },
              ]}
            />

            {processFormData.operating_calendar === 'CUSTOM' && (
              <Input
                label="Custom Operating Weekdays"
                value={processFormData.custom_operating_days || ''}
                onChange={(e) => setProcessFormData({ ...processFormData, custom_operating_days: e.target.value })}
                placeholder="0,1,2,3,4 (0=Mon, 6=Sun)"
              />
            )}

            <Input
              label="Minimum Headcount Per Shift"
              type="number"
              min="1"
              max="20"
              required
              value={processFormData.min_headcount_per_shift}
              onChange={(e) =>
                setProcessFormData({ ...processFormData, min_headcount_per_shift: Number(e.target.value) })
              }
            />

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="req247"
                checked={processFormData.requires_24_7}
                onChange={(e) => setProcessFormData({ ...processFormData, requires_24_7: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="req247" className="text-xs text-slate-300 font-medium cursor-pointer">
                Requires 24/7 round-the-clock staffing coverage
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddProcessModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Process Rule
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Brand Details Drawer */}
      {viewingBrand && (
        <Modal
          isOpen={true}
          onClose={() => setViewingBrand(null)}
          title={viewingBrand.name}
          subtitle={`Code: ${viewingBrand.code} &bull; Client: ${viewingBrand.client_name || 'Direct'}`}
          maxWidth="lg"
          footer={
            <Button size="sm" variant="outline" onClick={() => setViewingBrand(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-5">
            {/* Associated Brand Processes */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Brand Processes & Calendars
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleOpenAddProcess(viewingBrand.id);
                  }}
                  className="text-xs py-1 px-2.5"
                >
                  + Add Process
                </Button>
              </div>

              <div className="space-y-2">
                {brandProcesses
                  .filter((bp) => bp.brand_id === viewingBrand.id)
                  .map((bp) => (
                    <div
                      key={bp.id}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">{bp.process_name}</p>
                        <p className="text-slate-400 font-mono mt-0.5">{bp.operating_calendar}</p>
                      </div>
                      <Badge variant="purple" size="xs">
                        Min: {bp.min_headcount_per_shift} Staff
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>

            {/* Assigned Personnel */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Assigned Employees ({brandEmployees.length})
              </h4>
              {brandEmployees.length === 0 ? (
                <p className="text-xs text-slate-500 p-3 bg-slate-950 rounded-lg">
                  No active personnel mapped to this brand.
                </p>
              ) : (
                <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
                  {brandEmployees.map((a) => (
                    <div key={a.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-200">{a.employee_name}</span>
                        <span className="text-slate-500 text-[11px] ml-2 font-mono">({a.process_name})</span>
                      </div>
                      {a.is_primary && (
                        <Badge variant="info" size="xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
