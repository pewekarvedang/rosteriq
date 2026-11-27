import React, { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { shiftService } from '../../services/shiftService';
import { useToast } from '../../context/ToastContext';

import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Shift, ShiftCreate } from '../../types';

export const SettingsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [isAddShiftOpen, setIsAddShiftOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [shiftForm, setShiftForm] = useState<ShiftCreate>({
    name: '',
    code: '',
    start_time: '09:00:00',
    end_time: '17:00:00',
    duration_hours: 8.0,
    is_overnight: false,
    is_active: true,
  });

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const data = await shiftService.getAll();
      setShifts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to fetch shifts';
      showError('Failed to load shifts', message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleOpenAdd = () => {
    setShiftForm({
      name: '',
      code: '',
      start_time: '09:00:00',
      end_time: '17:00:00',
      duration_hours: 8.0,
      is_overnight: false,
      is_active: true,
    });
    setIsAddShiftOpen(true);
  };

  const handleOpenEdit = (s: Shift) => {
    setEditingShift(s);
    setShiftForm({
      name: s.name,
      code: s.code,
      start_time: s.start_time,
      end_time: s.end_time,
      duration_hours: s.duration_hours,
      is_overnight: s.is_overnight,
      is_active: s.is_active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingShift) {
        const updated = await shiftService.update(editingShift.id, shiftForm);
        setShifts((prev) => prev.map((s) => (s.id === editingShift.id ? updated : s)));
        showSuccess('Shift Updated', `${updated.name} saved.`);
        setEditingShift(null);
      } else {
        const created = await shiftService.create(shiftForm);
        setShifts((prev) => [...prev, created]);
        showSuccess('Shift Created', `${created.name} added.`);
        setIsAddShiftOpen(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      showError('Failed to save shift', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading shift definitions and solver rules..." />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <div className="border-b border-[#D9D4C7] pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-[#1B1A17] tracking-tight">SYSTEM SETTINGS &amp; RULES</h2>
          <Badge variant="default" size="xs">
            Schedule Policy
          </Badge>
        </div>
        <p className="text-xs text-[#57534A] mt-1">
          Shift time windows, weekly hour caps, rest rules, and CP-SAT constraint weights.
        </p>
      </div>

      {/* Shift Definitions Table */}
      <section className="border border-[#B8B1A1] bg-[#FBF9F5] rounded-[4px] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC]">
          <div>
            <h3 className="text-sm font-semibold text-[#1B1A17]">Operational Shift Windows</h3>
            <p className="text-xs text-[#57534A]">Start and end times enforced during schedule runs</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Shift
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse tabular-nums">
            <thead className="border-b border-[#B8B1A1] bg-[#F6F3EC] font-mono text-[11px] font-semibold uppercase tracking-wider text-[#57534A]">
              <tr>
                <th className="px-4 py-3">Shift Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3 text-center">Duration</th>
                <th className="px-4 py-3 text-center">Overnight</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9D4C7]">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-[#EDE8DC]/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#1B1A17]">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-[#164B78]">{s.code}</td>
                  <td className="px-4 py-3 font-mono text-[#1B1A17]">
                    {s.start_time.substring(0, 5)}&ndash;{s.end_time.substring(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-[#1B1A17]">
                    {s.duration_hours}h
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {s.is_overnight ? (
                      <span className="text-[#784300] font-semibold">Yes</span>
                    ) : (
                      <span className="text-[#57534A]">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={s.is_active ? 'success' : 'default'} size="xs" dot>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 h-auto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Asymmetric Rule Ledger (NOT 3 equal boxed cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px]">
          <div className="px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-xs font-bold uppercase tracking-wider text-[#1B1A17]">
            Hard &amp; Soft Constraint Rules
          </div>
          <dl className="divide-y divide-[#D9D4C7] text-xs tabular-nums">
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#1B1A17]">Default weekly hours cap</dt>
              <dd className="font-mono text-[#57534A]">40.0h / calendar week (scaled on partial weeks)</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#1B1A17]">Daily maximum shift hours</dt>
              <dd className="font-mono text-[#57534A]">8.0h / day (max 2 queues split per shift)</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#1B1A17]">Consecutive working days</dt>
              <dd className="font-mono text-[#57534A]">Max 6 consecutive days before required off day</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#1B1A17]">Minimum weekly rest</dt>
              <dd className="font-mono text-[#57534A]">At least 1 weekly off per week; approved leave blocked</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="font-semibold text-[#1B1A17]">Objective priority</dt>
              <dd className="font-mono text-[#57534A]">1. Fill headcount shortage (100,000) &middot; 2. Preferred offs</dd>
            </div>
          </dl>
        </section>

        <section className="lg:col-span-5 border border-[#D9D4C7] bg-[#FBF9F5] rounded-[4px]">
          <div className="px-4 py-3 border-b border-[#B8B1A1] bg-[#EDE8DC] font-mono text-xs font-bold uppercase tracking-wider text-[#1B1A17]">
            Runtime Architecture
          </div>
          <dl className="divide-y divide-[#D9D4C7] text-xs tabular-nums">
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="text-[#57534A]">API Server</dt>
              <dd className="font-mono text-[#1B1A17]">FastAPI + Python</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="text-[#57534A]">Schedule Solver</dt>
              <dd className="font-mono text-[#1B1A17]">Google OR-Tools CP-SAT</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="text-[#57534A]">Persistence</dt>
              <dd className="font-mono text-[#1B1A17]">SQLAlchemy 2.0 &middot; Alembic</dd>
            </div>
            <div className="px-4 py-3 flex justify-between gap-4">
              <dt className="text-[#57534A]">API Prefix</dt>
              <dd className="font-mono text-[#164B78]">/api/v1</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Add / Edit Shift Modal */}
      {(isAddShiftOpen || editingShift) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddShiftOpen(false);
            setEditingShift(null);
          }}
          title={editingShift ? `Edit Shift — ${editingShift.name}` : 'Add Shift'}
          subtitle="Set start time, end time, and duration"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Shift Name"
                required
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                placeholder="Morning Shift"
              />
              <Input
                label="Shift Code"
                required
                value={shiftForm.code}
                onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                placeholder="MORNING"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Start Time"
                type="time"
                step="1"
                required
                value={shiftForm.start_time}
                onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
              />
              <Input
                label="End Time"
                type="time"
                step="1"
                required
                value={shiftForm.end_time}
                onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
              />
              <Input
                label="Duration (h)"
                type="number"
                step="0.5"
                min="1"
                max="24"
                required
                value={shiftForm.duration_hours}
                onChange={(e) => setShiftForm({ ...shiftForm, duration_hours: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isOvernight"
                checked={shiftForm.is_overnight}
                onChange={(e) => setShiftForm({ ...shiftForm, is_overnight: e.target.checked })}
                className="rounded-[2px] border-[#B8B1A1]"
              />
              <label htmlFor="isOvernight" className="text-xs text-[#1B1A17] font-medium cursor-pointer">
                Overnight Shift (crosses midnight)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#D9D4C7]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddShiftOpen(false);
                  setEditingShift(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingShift ? 'Save Changes' : 'Create Shift'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
