import { describe, it, expect, vi } from 'vitest';
import { exportRosterToCSV } from '../utils/exportCSV';
import { EmployeeScheduleProfile } from '../types';

describe('exportRosterToCSV Utility', () => {
  it('generates CSV content and triggers download element', () => {
    // Mock document.body.appendChild and click
    const clickMock = vi.fn();
    const appendChildMock = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      (node as any).click = clickMock;
      return node;
    });
    const removeChildMock = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const mockSchedules: Record<string, EmployeeScheduleProfile> = {
      '1': {
        employee_id: 1,
        employee_code: 'EMP001',
        full_name: 'John Doe',
        pod_id: 1,
        pod_name: 'Pod Alpha',
        total_working_days: 20,
        total_hours: 160.0,
        total_weekly_offs: 8,
        total_leaves: 2,
        days: {
          '2026-11-01': {
            is_working: true,
            status: 'WORKING',
            shift_code: 'W',
            processes: [{ brand_id: 1, brand_name: 'BrandX', process_id: 1, process_name: 'CS', allocated_hours: 8.0 }],
          },
          '2026-11-02': {
            is_working: false,
            status: 'WEEKLY_OFF',
            processes: [],
          },
        },
      },
    };

    exportRosterToCSV(mockSchedules, 11, 2026);
    expect(appendChildMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();

    appendChildMock.mockRestore();
    removeChildMock.mockRestore();
  });
});
