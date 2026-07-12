import { describe, it, expect } from 'vitest';
import { toIsoDate, rangePresetDates } from './analyticsRange';

describe('toIsoDate', () => {
  it('returns the YYYY-MM-DD UTC slice', () => {
    expect(toIsoDate(new Date('2026-07-09T15:30:00.000Z'))).toBe('2026-07-09');
  });
});

describe('rangePresetDates', () => {
  const now = new Date('2026-07-09T12:00:00.000Z');

  it('spans N calendar days inclusive of today for a 7-day preset', () => {
    expect(rangePresetDates(7, now)).toEqual({ from: '2026-07-03', to: '2026-07-09' });
  });

  it('handles a 30-day preset crossing a month boundary', () => {
    expect(rangePresetDates(30, now)).toEqual({ from: '2026-06-10', to: '2026-07-09' });
  });

  it('handles a 90-day preset', () => {
    expect(rangePresetDates(90, now)).toEqual({ from: '2026-04-11', to: '2026-07-09' });
  });

  it('a 1-day preset returns today for both bounds', () => {
    expect(rangePresetDates(1, now)).toEqual({ from: '2026-07-09', to: '2026-07-09' });
  });
});
