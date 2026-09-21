import { describe, it, expect } from 'vitest';
import { toIsoDate, rangePresetDates } from './analyticsRange';

describe('toIsoDate', () => {
  it('returns the VN calendar day', () => {
    expect(toIsoDate(new Date('2026-07-09T15:30:00.000Z'))).toBe('2026-07-09');
  });

  it('has already rolled over before 07:00 VN', () => {
    // 02:00 VN on 20 Sep — a UTC slice would send the API 2026-09-19 and drop
    // the morning's orders out of the window.
    expect(toIsoDate(new Date('2026-09-19T19:00:00.000Z'))).toBe('2026-09-20');
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

  it('counts from the VN day when UTC is still on the previous one', () => {
    // 02:00 VN on 20 Sep: the 7-day window ends today (20th), not on the 19th.
    expect(rangePresetDates(7, new Date('2026-09-19T19:00:00.000Z'))).toEqual({
      from: '2026-09-14',
      to: '2026-09-20',
    });
  });
});
