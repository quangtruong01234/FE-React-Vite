import { describe, it, expect } from 'vitest';
import { formatMessageTime } from './chatMessageTime';

// Wednesday 2026-10-07 15:00 local time.
const now = new Date(2026, 9, 7, 15, 0);
const hhmm = (d: Date): string =>
  d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

describe('formatMessageTime', () => {
  const today = new Date(2026, 9, 7, 9, 5);
  const yesterday = new Date(2026, 9, 6, 22, 30);
  const monday = new Date(2026, 9, 5, 8, 0);
  const old = new Date(2026, 8, 1, 7, 45);

  it('shows only the time for a message sent today', () => {
    expect(formatMessageTime(today.toISOString(), now)).toBe(hhmm(today));
  });

  it('labels yesterday, then a weekday, then a full date', () => {
    expect(formatMessageTime(yesterday.toISOString(), now)).toBe(`Hôm qua ${hhmm(yesterday)}`);
    expect(formatMessageTime(monday.toISOString(), now)).toBe(`T2 ${hhmm(monday)}`);
    expect(formatMessageTime(old.toISOString(), now)).toBe(`01/09/2026 ${hhmm(old)}`);
  });

  it('treats a zone-less backend timestamp as UTC', () => {
    const iso = today.toISOString();
    expect(formatMessageTime(iso.slice(0, -1), now)).toBe(formatMessageTime(iso, now));
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(formatMessageTime('not a date', now)).toBe('');
  });

  it('speaks English when asked (I18N-05)', () => {
    expect(formatMessageTime(yesterday.toISOString(), now, 'en')).toBe(`Yesterday ${hhmm(yesterday)}`);
    expect(formatMessageTime(monday.toISOString(), now, 'en')).toBe(`Mon ${hhmm(monday)}`);
    expect(formatMessageTime(old.toISOString(), now, 'en')).toBe(`09/01/2026 ${hhmm(old)}`);
  });
});
