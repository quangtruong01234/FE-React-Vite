/**
 * Which calendar day an instant falls on, in Vietnam wall-clock (EXPORT-TZ-01).
 *
 * Shared by the date picker (`lib/date/calendar`) and the analytics/export range
 * presets (`features/order/analytics/analyticsRange`), because both turn "now"
 * into a `YYYY-MM-DD` that the export API compares as a calendar day — and the
 * two sides have to agree on which day that string denotes.
 *
 * **Why not UTC** (what this replaced). `new Date().toISOString().slice(0, 10)`
 * is the previous day for every VN seller between 00:00 and 07:00: at 02:00 on
 * 20/09 the picker highlighted 19/09 as "today", the "Hôm nay" button inserted
 * 19/09, and the default export window ended on 19/09 — so a seller doing the
 * morning's books before 7am silently exported nothing from today.
 *
 * **Why not local parts either.** `getFullYear()/getDate()` is right only when
 * the machine's clock is on VN time. That is exactly the assumption that broke
 * on the backend: the same code read correctly on a UTC+7 dev box and 7 hours
 * wrong in a UTC container.
 *
 * So: a fixed offset, matching the backend's `toVnCalendarDay`
 * (`api/libs/common/src/utils/timezone.util.ts`) shape for shape — shift the
 * instant, then read UTC parts. Vietnam is UTC+7 year-round (no DST since 1975),
 * which is what makes a constant exact rather than an approximation.
 */

/** Vietnam's fixed offset from UTC, in minutes. */
export const VN_UTC_OFFSET_MINUTES = 7 * 60;

const MINUTE_MS = 60 * 1000;

/** Milliseconds in a day — exact for VN, which has no DST transitions. */
export const VN_DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * The VN calendar day of `instant` as `YYYY-MM-DD`.
 *
 * Throws on an invalid `Date`, the same as the `toISOString()` it wraps — every
 * caller here builds the instant itself, so a bad value is a bug, not input.
 */
export function toVnIsoDay(instant: Date = new Date()): string {
  const shifted = new Date(instant.getTime() + VN_UTC_OFFSET_MINUTES * MINUTE_MS);
  return shifted.toISOString().slice(0, 10);
}

/**
 * The VN calendar day `days` days before the VN day of `instant`.
 *
 * Plain millisecond arithmetic rather than `setDate()`: the latter steps in the
 * *machine's* zone, which reintroduces the dependency this module exists to
 * remove.
 */
export function vnIsoDayBefore(instant: Date, days: number): string {
  return toVnIsoDay(new Date(instant.getTime() - days * VN_DAY_MS));
}
