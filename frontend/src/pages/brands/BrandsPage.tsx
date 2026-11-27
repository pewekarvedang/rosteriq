import React, { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { brandService } from '../../services/brandService';
import { processService } from '../../services/processService';
import { assignmentService } from '../../services/assignmentService';
import { useToast } from '../../context/ToastContext';

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

  const [isAddBrandOpen, setIsAddBrandOpen] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isAddProcessModalOpen, setIsAddProcessModalOpen] = useState<boolean>(false);
  const [brandEmployees, setBrandEmployees] = useState<EmployeeAssignment[]>([]);

  const [brandFormData, setBrandFormData] = useState<BrandCreate>({
    name: '',
    code: '',
    client_name: '',
    description: '',
    is_active: true,
  });

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
      if (bList.length > 0 && !selectedBrand) {
        handleSelectBrand(bList[0]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch brands';
      showError('Failed to load brands', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectBrand = async (b: Brand) => {
    setSelectedBrand(b);
    try {
      const assigns = await assignmentService.getAll({ brand_id: b.id });
      setBrandEmployees(assigns);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to load brand staff';
      showError('Failed to load brand employees', message);
    }
  };

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

  const handleSubmitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBrand) {
        const updated = await brandService.update(editingBrand.id, brandFormData);
        setBrands((prev) => prev.map((b) => (b.id === editingBrand.id ? updated : b)));
        if (selectedBrand?.id === editingBrand.id) setSelectedBrand(updated);
        showSuccess('Brand Updated', `${updated.name} saved.`);
        setEditingBrand(null);
      } else {
        const created = await brandService.create(brandFormData);
        setBrands((prev) => [...prev, created]);
        handleSelectBrand(created);
        showSuccess('Brand Created', `${created.name} added.`);
        setIsAddBrandOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      showError('Failed to save brand', message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleSubmitBrandProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await brandService.createBrandProcess(processFormData);
      setBrandProcesses((prev) => [...prev, created]);
      showSuccess('Process Linked', 'Operating calendar and headcount rule saved.');
      setIsAddProcessModalOpen(false);
      const bpList = await brandService.getBrandProcesses();
      setBrandProcesses(bpList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to link process';
      showError('Failed to link process', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading client brands and operating calendars..." />;
  }

  const selectedProcs = selectedBrand
    ? brandProcesses.filter((bp) => bp.brand_id === selectedBrand.id)
    : [];

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D4C7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">CLIENT BRANDS MANAGEMENT</h2>
            <Badge variant="default" size="xs">
              {brands.length} Brands
            </Badge>
          </div>
          <p className="text-xs text-[#57534A] mt-1">
            Client accounts, queue calendars, and minimum headcount per shift.
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

      {/* Asymmetric Split: Ruled Brand Table (7 cols) + Account Calendar Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead className="border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Brand &amp; Client</th>
                  <th className="px-4 py-3 text-center">Processes</th>
                  <th className="px-4 py-3 text-center">Staff</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9D4C7]">
                {brands.map((b) => {
                  const procs = brandProcesses.filter((bp) => bp.brand_id === b.id);
                  const active = selectedBrand?.id === b.id;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => handleSelectBrand(b)}
                      className={`cursor-pointer transition-colors ${
                        active ? 'bg-[#EDE8DC]' : 'hover:bg-[#EDE8DC]/40'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#164B78]">{b.code}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-[#1B1A17]">{b.name}</div>
                        {b.client_name && (
                          <div className="text-[11px] text-[#57534A]">{b.client_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-[#1B1A17]">
                        {procs.length}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-[#1B1A17]">
                        {b.assigned_employee_count}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={b.is_active ? 'success' : 'default'} size="xs" dot>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAddProcess(b.id)}
                            className="px-2 py-1 h-auto text-[11px] text-[#164B78]"
                          >
                            + Process
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditBrand(b)}
                            className="p-1.5 h-auto"
                            title="Edit Brand"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="lg:col-span-5 border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px]">
          {selectedBrand ? (
            <>
              <div className="px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC] flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#1B1A17]">{selectedBrand.name}</h3>
                  <p className="font-mono text-[11px] text-[#57534A]">
                    {selectedBrand.code} &middot; {selectedBrand.client_name || 'Direct'}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenAddProcess(selectedBrand.id)}>
                  + Add Process
                </Button>
              </div>

              <div className="p-4 space-y-5">
                <div>
                  <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A] mb-2">
                    Process Rules ({selectedProcs.length})
                  </h4>
                  {selectedProcs.length === 0 ? (
                    <p className="text-xs text-[#57534A] p-3 border border-[#D9D4C7] rounded-[4px]">
                      No processes configured for this brand.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#D9D4C7] border border-[#D9D4C7] rounded-[4px]">
                      {selectedProcs.map((bp) => (
                        <div key={bp.id} className="p-3 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="font-semibold text-[#1B1A17]">{bp.process_name}</p>
                            <p className="text-[#57534A] font-mono text-[11px] mt-0.5">{bp.operating_calendar}</p>
                          </div>
                          <Badge variant="info" size="xs">
                            Min {bp.min_headcount_per_shift}/shift
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A] mb-2">
                    Assigned Staff ({brandEmployees.length})
                  </h4>
                  {brandEmployees.length === 0 ? (
                    <p className="text-xs text-[#57534A] p-3 border border-[#D9D4C7] rounded-[4px]">
                      No employees currently mapped to this brand.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#D9D4C7] border border-[#D9D4C7] rounded-[4px] max-h-60 overflow-y-auto">
                      {brandEmployees.map((a) => (
                        <div key={a.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-[#1B1A17]">{a.employee_name}</span>
                            <span className="text-[#57534A] text-[11px] ml-2 font-mono">
                              ({a.process_name})
                            </span>
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
            </>
          ) : (
            <p className="p-6 text-xs text-[#57534A]">Select a brand row to inspect process rules.</p>
          )}
        </aside>
      </div>

      {/* Add / Edit Brand Modal */}
      {(isAddBrandOpen || editingBrand) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddBrandOpen(false);
            setEditingBrand(null);
          }}
          title={editingBrand ? `Edit Brand — ${editingBrand.name}` : 'Add Client Brand'}
          subtitle="Set brand identifier and client legal name"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitBrand} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Brand Name"
                required
                value={brandFormData.name}
                onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
                placeholder="GlowSkin Organics"
              />
              <Input
                label="Brand Code"
                required
                value={brandFormData.code}
                onChange={(e) => setBrandFormData({ ...brandFormData, code: e.target.value })}
                placeholder="GLOWSKIN"
              />
            </div>

            <Input
              label="Client Legal Entity (Optional)"
              value={brandFormData.client_name || ''}
              onChange={(e) => setBrandFormData({ ...brandFormData, client_name: e.target.value })}
              placeholder="GlowSkin Naturals LLC"
            />

            <Input
              label="Description (Optional)"
              value={brandFormData.description || ''}
              onChange={(e) => setBrandFormData({ ...brandFormData, description: e.target.value })}
              placeholder="D2C support client"
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
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

      {/* Add Process Rule Modal */}
      {isAddProcessModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddProcessModalOpen(false)}
          title="Link Brand Process"
          subtitle="Configure operating calendar and minimum shift headcount"
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
                { value: 'EXCEPT_PUBLIC_HOLIDAYS', label: 'EXCEPT_PUBLIC_HOLIDAYS' },
                { value: 'EXCEPT_SUNDAYS_AND_HOLIDAYS', label: 'EXCEPT_SUNDAYS_AND_HOLIDAYS (Mon-Sat)' },
                { value: 'CUSTOM', label: 'CUSTOM (Weekday numbers)' },
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
                className="rounded-[2px] border-[#B8B1A1]"
              />
              <label htmlFor="req247" className="text-xs text-[#1B1A17] font-medium cursor-pointer">
                Requires 24/7 staffing across all shifts
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddProcessModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Rule
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
