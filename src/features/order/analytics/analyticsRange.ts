/** `YYYY-MM-DD` slice of the ISO string (UTC), the shape the analytics API expects. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Inclusive `{ from, to }` range for a "last N days" preset: `to` is `now` and
 * `from` is `N - 1` days earlier, so a 7-day preset spans 7 calendar days
 * including today. `now` is injectable for deterministic tests.
 */
export function rangePresetDates(
  days: number,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return { from: toIsoDate(from), to: toIsoDate(to) };
}
