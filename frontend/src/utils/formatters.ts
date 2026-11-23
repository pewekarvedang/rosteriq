import { OperatingCalendarRule } from '../types';

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '-';
  return timeString.substring(0, 5);
};

export const getDayOfWeekName = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

export const explainOperatingRule = (rule: OperatingCalendarRule, customDays?: string | null): string => {
  switch (rule) {
    case 'EVERYDAY':
      return 'Operates all 7 days including public holidays (24/7 or continuous)';
    case 'EXCEPT_PUBLIC_HOLIDAYS':
      return 'Operates every day except declared public holidays';
    case 'EXCEPT_SUNDAYS_AND_HOLIDAYS':
      return 'Operates Monday through Saturday; closed on Sundays & public holidays';
    case 'CUSTOM':
      return `Custom active days (${customDays || 'configured'})`;
    default:
      return rule;
  }
};
