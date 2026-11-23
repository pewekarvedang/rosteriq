import { EmployeeScheduleProfile } from '../types';

export const exportRosterToCSV = (
  employeeSchedules: Record<string, EmployeeScheduleProfile>,
  month: number,
  year: number
) => {
  const employees = Object.values(employeeSchedules);
  if (!employees.length) return;

  // Find all dates from first employee profile
  const sampleEmp = employees[0];
  const dates = Object.keys(sampleEmp.days).sort();

  // CSV Headers: Employee Code, Employee Name, Pod, Total Hours, Total Working Days, Total Offs, Total Leaves, [Dates...]
  const header = [
    'Employee Code',
    'Full Name',
    'Operational Pod',
    'Total Working Days',
    'Total Hours',
    'Weekly Offs',
    'Approved Leaves',
    ...dates.map((d) => {
      const parts = d.split('-');
      return `${parts[1]}/${parts[2]}`; // MM/DD
    }),
  ];

  const rows: string[][] = [header];

  for (const emp of employees) {
    const row = [
      `"${emp.employee_code}"`,
      `"${emp.full_name}"`,
      `"${emp.pod_name || 'Unassigned'}"`,
      emp.total_working_days.toString(),
      emp.total_hours.toFixed(1),
      emp.total_weekly_offs.toString(),
      emp.total_leaves.toString(),
    ];

    for (const d of dates) {
      const dayData = emp.days[d];
      if (!dayData) {
        row.push('OFF');
      } else if (dayData.is_working) {
        const procs = dayData.processes
          .map((p) => `${p.brand_name} (${p.process_name})`)
          .join('; ');
        row.push(`"${dayData.shift_code || 'W'} [${procs}]"`);
      } else {
        row.push(`"${dayData.status}"`);
      }
    }

    rows.push(row);
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `RosterIQ_Schedule_${year}_${String(month).padStart(2, '0')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
