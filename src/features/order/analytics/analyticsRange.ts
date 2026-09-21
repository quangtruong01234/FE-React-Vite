import { toVnIsoDay, vnIsoDayBefore } from '@/lib/date/vnDay';

/**
 * `YYYY-MM-DD` for the **VN** calendar day an instant falls on — the shape the
 * analytics and export APIs expect, and the day boundary they snap to.
 */
export function toIsoDate(date: Date): string {
  return toVnIsoDay(date);
}

/**
 * Inclusive `{ from, to }` range for a "last N days" preset: `to` is `now` and
 * `from` is `N - 1` days earlier, so a 7-day preset spans 7 calendar days
 * including today. `now` is injectable for deterministic tests.
 *
 * Counted in VN days at both ends. Stepping back with `setDate()` would count in
 * the machine's zone, which lands on a different `from` than the seller sees in
 * the picker for anyone whose clock is not on VN time.
 */
export function rangePresetDates(
  days: number,
  now: Date = new Date(),
): { from: string; to: string } {
  return { from: vnIsoDayBefore(now, days - 1), to: toVnIsoDay(now) };
}
