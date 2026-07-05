import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, relativeTimeShort, relativeTimeLong } from './time';

// Local-time ISO (no Z) so the expected day/hour don't shift with the runner's timezone.
const SAMPLE = '2026-03-02T14:05:00';

describe('formatDate', () => {
  it('formats as dd/MM/yyyy', () => {
    expect(formatDate(SAMPLE)).toBe('02/03/2026');
  });

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('includes date and time parts', () => {
    const out = formatDateTime(SAMPLE);
    expect(out).toContain('02/03/2026');
    expect(out).toContain('14:05');
  });

  it('returns empty string for empty input', () => {
    expect(formatDateTime('')).toBe('');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDateTime('not-a-date')).toBe('');
  });
});

describe('relativeTimeShort', () => {
  const now = new Date('2026-07-04T12:00:00').getTime();
  const at = (msAgo: number): string => new Date(now - msAgo).toISOString();

  it('under a minute → Vừa xong', () => {
    expect(relativeTimeShort(at(30_000), now)).toBe('Vừa xong');
  });

  it('minutes → Np', () => {
    expect(relativeTimeShort(at(5 * 60_000), now)).toBe('5p');
  });

  it('hours → Ng', () => {
    expect(relativeTimeShort(at(3 * 3_600_000), now)).toBe('3g');
  });

  it('days → Nn', () => {
    expect(relativeTimeShort(at(2 * 86_400_000), now)).toBe('2n');
  });

  it('invalid input → empty string', () => {
    expect(relativeTimeShort('not-a-date', now)).toBe('');
  });
});

describe('relativeTimeLong', () => {
  const now = new Date('2026-07-04T12:00:00').getTime();
  const at = (msAgo: number): string => new Date(now - msAgo).toISOString();

  it('under a minute → Vừa xong', () => {
    expect(relativeTimeLong(at(30_000), now)).toBe('Vừa xong');
  });

  it('minutes → N phút trước', () => {
    expect(relativeTimeLong(at(5 * 60_000), now)).toBe('5 phút trước');
  });

  it('hours → N giờ trước', () => {
    expect(relativeTimeLong(at(3 * 3_600_000), now)).toBe('3 giờ trước');
  });

  it('days → N ngày trước', () => {
    expect(relativeTimeLong(at(2 * 86_400_000), now)).toBe('2 ngày trước');
  });

  it('invalid input → empty string', () => {
    expect(relativeTimeLong('not-a-date', now)).toBe('');
  });
});
