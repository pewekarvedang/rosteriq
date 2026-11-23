import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, explainOperatingRule } from '../utils/formatters';

describe('Formatters Utilities', () => {
  it('formats dates consistently', () => {
    expect(formatDate('2026-11-15')).toContain('2026');
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });

  it('formats time strings', () => {
    expect(formatTime('09:00:00')).toBe('09:00');
    expect(formatTime(null)).toBe('-');
  });

  it('explains operating rules clearly', () => {
    expect(explainOperatingRule('EVERYDAY')).toContain('all 7 days');
    expect(explainOperatingRule('EXCEPT_PUBLIC_HOLIDAYS')).toContain('except declared public holidays');
    expect(explainOperatingRule('EXCEPT_SUNDAYS_AND_HOLIDAYS')).toContain('closed on Sundays');
    expect(explainOperatingRule('CUSTOM', '0,1,2,3,4')).toContain('0,1,2,3,4');
  });
});
