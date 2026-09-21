import { describe, it, expect } from 'vitest';
import {
  WEEKDAY_LABELS,
  currentMonth,
  formatIsoDay,
  isDayInRange,
  isoDay,
  monthGrid,
  monthOfIsoDay,
  monthTitle,
  shiftMonth,
  todayIso,
} from './calendar';

describe('isoDay', () => {
  it('zero-pads month and day', () => {
    expect(isoDay(2026, 9, 7)).toBe('2026-09-07');
    expect(isoDay(2026, 12, 31)).toBe('2026-12-31');
  });
});

describe('todayIso / currentMonth', () => {
  it('reads the VN calendar day, not the UTC one', () => {
    // 23:30 VN on 30 Sep — UTC agrees here, so this leg only pins the easy case.
    const evening = new Date('2026-09-30T16:30:00.000Z');
    expect(todayIso(evening)).toBe('2026-09-30');
    expect(currentMonth(evening)).toEqual({ year: 2026, month: 9 });
  });

  it('is already the next VN day before 07:00, and the header follows it', () => {
    // 00:30 VN on 1 Oct. Reading UTC parts called this 30 Sep, so the grid
    // opened on September and marked the wrong cell as today.
    const afterMidnight = new Date('2026-09-30T17:30:00.000Z');
    expect(todayIso(afterMidnight)).toBe('2026-10-01');
    expect(currentMonth(afterMidnight)).toEqual({ year: 2026, month: 10 });
  });
});

describe('monthOfIsoDay', () => {
  it('reads the month of a valid day', () => {
    expect(monthOfIsoDay('2026-08-19')).toEqual({ year: 2026, month: 8 });
  });

  it('rejects a day that does not exist in that month', () => {
    // `Date.parse` reads this as 3 March and would open the wrong month.
    expect(monthOfIsoDay('2026-02-31')).toBeNull();
    expect(monthOfIsoDay('2026-13-01')).toBeNull();
    expect(monthOfIsoDay('2026-00-10')).toBeNull();
  });

  it('accepts 29 February in a leap year and rejects it otherwise', () => {
    expect(monthOfIsoDay('2028-02-29')).toEqual({ year: 2028, month: 2 });
    expect(monthOfIsoDay('2026-02-29')).toBeNull();
  });

  it('rejects anything that is not YYYY-MM-DD', () => {
    expect(monthOfIsoDay('')).toBeNull();
    expect(monthOfIsoDay('19/08/2026')).toBeNull();
    expect(monthOfIsoDay('2026-08-19T00:00:00Z')).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('moves within the year', () => {
    expect(shiftMonth({ year: 2026, month: 9 }, -4)).toEqual({ year: 2026, month: 5 });
  });

  it('rolls over both year boundaries', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('handles a jump of more than a year', () => {
    expect(shiftMonth({ year: 2026, month: 3 }, -15)).toEqual({ year: 2024, month: 12 });
    expect(shiftMonth({ year: 2026, month: 3 }, 22)).toEqual({ year: 2028, month: 1 });
  });
});

describe('monthTitle', () => {
  it('reads as a vi-VN month header', () => {
    expect(monthTitle({ year: 2026, month: 9 })).toBe('Tháng 9 2026');
  });
});

describe('formatIsoDay', () => {
  it('formats without touching Date — no timezone can shift it', () => {
    expect(formatIsoDay('2026-08-19')).toBe('19/08/2026');
    expect(formatIsoDay('2026-01-01')).toBe('01/01/2026');
  });

  it('is empty for an unusable value', () => {
    expect(formatIsoDay('')).toBe('');
    expect(formatIsoDay('2026-02-31')).toBe('');
  });
});

describe('monthGrid', () => {
  it('always lays out 6 rows of 7, so the popover never resizes', () => {
    for (const month of [1, 2, 5, 8, 11, 12]) {
      const grid = monthGrid({ year: 2026, month });
      expect(grid).toHaveLength(6);
      expect(grid.every(week => week.length === WEEKDAY_LABELS.length)).toBe(true);
    }
  });

  it('starts the month in its Monday-first column', () => {
    // 1 Sep 2026 is a Tuesday → one leading blank.
    const grid = monthGrid({ year: 2026, month: 9 });
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBe('2026-09-01');
  });

  it('puts a Monday first with no leading blank', () => {
    // 1 Jun 2026 is a Monday.
    expect(monthGrid({ year: 2026, month: 6 })[0][0]).toBe('2026-06-01');
  });

  it('puts a Sunday in the last column', () => {
    // 1 Feb 2026 is a Sunday → six leading blanks.
    const grid = monthGrid({ year: 2026, month: 2 });
    expect(grid[0].slice(0, 6).every(cell => cell === null)).toBe(true);
    expect(grid[0][6]).toBe('2026-02-01');
  });

  it('holds every day of the month and nothing from its neighbours', () => {
    const days = monthGrid({ year: 2026, month: 2 }).flat().filter(Boolean);
    expect(days).toHaveLength(28);
    expect(days[0]).toBe('2026-02-01');
    expect(days[days.length - 1]).toBe('2026-02-28');

    expect(monthGrid({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
    expect(monthGrid({ year: 2026, month: 1 }).flat().filter(Boolean)).toHaveLength(31);
  });
});

describe('isDayInRange', () => {
  it('is inclusive at both bounds', () => {
    expect(isDayInRange('2026-08-19', '2026-08-19', '2026-09-17')).toBe(true);
    expect(isDayInRange('2026-09-17', '2026-08-19', '2026-09-17')).toBe(true);
  });

  it('rejects days outside the bounds', () => {
    expect(isDayInRange('2026-08-18', '2026-08-19', '2026-09-17')).toBe(false);
    expect(isDayInRange('2026-09-18', '2026-08-19', '2026-09-17')).toBe(false);
  });

  it('treats a missing or empty bound as open-ended', () => {
    expect(isDayInRange('2030-01-01')).toBe(true);
    expect(isDayInRange('2030-01-01', '', '')).toBe(true);
    expect(isDayInRange('2030-01-01', undefined, '2026-09-17')).toBe(false);
  });
});
