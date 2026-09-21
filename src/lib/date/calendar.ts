/**
 * Pure calendar math for `components/shared/DateField` — the app's own date
 * picker, which replaced the browser's native `type="date"` chrome (it ignores
 * every `tb-*` token and looks like a different product).
 *
 * Everything is a `YYYY-MM-DD` string. The grid's own geometry is built from UTC
 * parts — a month's length and its leading weekday are the same in any zone, and
 * UTC keeps them free of the machine's clock. But **which day is "today"** is a
 * VN question, so that one comes from `toVnIsoDay` (see `vnDay.ts`), matching the
 * backend's calendar-day boundary. ISO days sort lexicographically, so range
 * checks here are plain string comparisons — no `Date` round-trip.
 */

import chunk from 'lodash/chunk';
import { toVnIsoDay } from './vnDay';

/** Monday-first, the way a vi-VN calendar is printed. */
export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

/** Always render 6 rows so the popover does not resize when the month changes. */
const GRID_ROWS = 6;
const DAYS_PER_WEEK = 7;

export interface CalendarMonth {
  year: number;
  /** 1-12, **not** the 0-based `Date` month. */
  month: number;
}

/** `YYYY-MM-DD` for a calendar day, zero-padded. */
export function isoDay(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Today as `YYYY-MM-DD` in VN wall-clock, injectable for deterministic tests. */
export function todayIso(now: Date = new Date()): string {
  return toVnIsoDay(now);
}

/**
 * The month a `YYYY-MM-DD` day belongs to, or `null` when the string is not a
 * real calendar day — `'2026-02-31'` included, which `Date.parse` would happily
 * read as 3 March and open the grid on the wrong month.
 */
export function monthOfIsoDay(iso: string): CalendarMonth | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month };
}

/**
 * The month containing `now` in VN wall-clock, for opening the grid with no
 * value set. Derived from `todayIso` so the header can never disagree with the
 * day the grid marks as today across a month boundary.
 */
export function currentMonth(now: Date = new Date()): CalendarMonth {
  const iso = todayIso(now);
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
  };
}

/** `delta` months later (negative for earlier), rolling the year over. */
export function shiftMonth({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    // `%` keeps the sign in JS, so a negative delta needs the extra wrap.
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

/** Header text, e.g. `Tháng 9 2026`. */
export function monthTitle({ year, month }: CalendarMonth): string {
  return `Tháng ${month} ${year}`;
}

/** `19/08/2026` — the trigger's text, formatted from the string so no timezone is involved. */
export function formatIsoDay(iso: string): string {
  if (monthOfIsoDay(iso) === null) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The month laid out as 6 rows of 7 cells, Monday-first. `null` is a blank cell
 * outside the month — neighbouring-month days are deliberately not shown, so
 * every number on screen belongs to the month in the header.
 */
export function monthGrid({ year, month }: CalendarMonth): (string | null)[][] {
  // `getUTCDay()` is Sunday-first; rotate so Monday is column 0.
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % DAYS_PER_WEEK;
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    cells.push(isoDay(year, month, day));
  }
  while (cells.length < GRID_ROWS * DAYS_PER_WEEK) cells.push(null);
  return chunk(cells, DAYS_PER_WEEK);
}

/** Whether a day is selectable, given optional inclusive `min` / `max` days. */
export function isDayInRange(iso: string, min?: string, max?: string): boolean {
  if (min !== undefined && min !== '' && iso < min) return false;
  if (max !== undefined && max !== '' && iso > max) return false;
  return true;
}
