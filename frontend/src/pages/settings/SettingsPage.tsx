import React, { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  Shield,
  Cpu,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Server,
  Database,
  Mail,
} from 'lucide-react';

import { shiftService } from '../../services/shiftService';
import { useToast } from '../../context/ToastContext';

import { Card, CardHeader } from '../../components/common/Card';
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

  // Modals state
  const [isAddShiftOpen, setIsAddShiftOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Shift form
  const [shiftForm, setShiftForm] = useState<ShiftCreate>({
    name: '',
    code: '',
    start_time: '09:00:00',
    end_time: '18:00:00',
    duration_hours: 8.0,
    is_overnight: false,
    is_active: true,
  });

  const loadShifts = async () => {
    setIsLoading(true);
    try {
      const data = await shiftService.getAll();
      setShifts(data);
    } catch (err: any) {
      showError('Failed to load shifts', err.message);
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
      end_time: '18:00:00',
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
        showSuccess('Shift Updated', `${updated.name} updated.`);
        setEditingShift(null);
      } else {
        const created = await shiftService.create(shiftForm);
        setShifts((prev) => [...prev, created]);
        showSuccess('Shift Created', `${created.name} registered.`);
        setIsAddShiftOpen(false);
      }
    } catch (err: any) {
      showError('Failed to save shift', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading configuration & shift definitions..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">SYSTEM SETTINGS & RULES</h2>
          <Badge variant="purple" size="xs">
            Configuration
          </Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Shift operational windows, weekly-off distribution rules, workload constraints and solver parameters
        </p>
      </div>

      {/* Section 1: Shifts Configuration */}
      <Card>
        <CardHeader
          title="Operational Shift Windows"
          subtitle="Shifts enforced during employee allocation and multi-process slotting"
          action={
            <Button size="sm" variant="primary" onClick={handleOpenAdd} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add Shift
            </Button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Shift Name</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Time Window</th>
                <th className="px-4 py-3 text-center">Duration</th>
                <th className="px-4 py-3 text-center">Overnight</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-200">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-indigo-400">{s.code}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-100">{s.duration_hours} hrs</td>
                  <td className="px-4 py-3 text-center">
                    {s.is_overnight ? (
                      <span className="text-amber-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={s.is_active ? 'success' : 'default'} size="xs">
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 h-auto text-slate-400 hover:text-slate-200"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 2: Workforce Scheduling Rules & Policies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2 text-indigo-400">
            <Clock className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100">Workload Capacity Standard</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            - Maximum weekly hours: <strong>40.0 hours</strong>
            <br />
            - Maximum daily hours: <strong>8.0 hours</strong> (up to 2 processes per shift)
            <br />
            - Proportional scaling applied for partial calendar weeks.
          </p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <Shield className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100">Weekly Rest & Consecutivity</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            - At least <strong>1 required weekly off</strong> per calendar week.
            <br />
            - Maximum <strong>6 consecutive working days</strong> before mandatory rest.
            <br />
            - Fair distribution of weekend shifts across pod peers.
          </p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2 text-purple-400">
            <Cpu className="w-4 h-4" />
            <h4 className="text-sm font-bold text-slate-100">Deterministic CP-SAT Priorities</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            - Priority 1: Minimize coverage shortages (weight 100,000)
            <br />
            - Priority 2: Satisfy mandatory rest rules (hard constraint)
            <br />
            - Priority 3: Honor preferred weekly offs & balanced workload.
          </p>
        </Card>
      </div>

      {/* Section 3: Assessment Information & Platform Architecture */}
      <Card className="p-5 border-slate-800">
        <CardHeader
          title="DataStraw Internship Assessment Architecture"
          subtitle="Smart Roster Management System & Deployment Details"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Server className="w-4 h-4" />
              <span>Backend & Optimizer</span>
            </div>
            <p className="text-slate-300">
              <strong>Framework:</strong> FastAPI & Python 3.14
            </p>
            <p className="text-slate-300">
              <strong>Constraint Engine:</strong> Google OR-Tools CP-SAT (v9.11)
            </p>
            <p className="text-slate-300">
              <strong>Database:</strong> PostgreSQL / SQLAlchemy 2.0 with Alembic
            </p>
            <p className="text-slate-300">
              <strong>Port:</strong> 8000 &bull; Proxy: /api/v1
            </p>
          </div>

          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Mail className="w-4 h-4" />
              <span>Assessment Reporting Recipients</span>
            </div>
            <p className="text-slate-300">
              <strong>Primary Recipients:</strong>
              <br />
              &bull; ozair.shaikh@datastraw.in
              <br />
              &bull; aryan.jaiswal@datastraw.in
            </p>
            <p className="text-slate-300">
              <strong>CC:</strong> talent@datastraw.in
            </p>
            <p className="text-slate-300">
              <strong>Subject Format:</strong> Smart Roster Management System Assignment - [Full Name]
            </p>
          </div>
        </div>
      </Card>

      {/* Add / Edit Shift Modal */}
      {(isAddShiftOpen || editingShift) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsAddShiftOpen(false);
            setEditingShift(null);
          }}
          title={editingShift ? `Edit Shift - ${editingShift.name}` : 'Add Shift Definition'}
          subtitle="Configure shift start/end times and duration"
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
                label="Duration (Hours)"
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
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isOvernight" className="text-xs text-slate-300 font-medium cursor-pointer">
                Overnight Shift (crosses midnight boundary)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
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
