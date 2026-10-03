import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Variation } from "@/types"
import { LANG_LOCALE, type Lang } from "@/lib/i18n/lang"
import { translate } from "@/lib/i18n/messages"
import { formatMessages } from "./format.i18n"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Coerce a money value to a finite number. Backend money fields now serialize
 * as JSON numbers, but historical/edge responses can still arrive as decimal
 * strings (e.g. "2000.00"); accept both so callers never render raw decimals.
 */
function toMoneyNumber(n: number | string | null | undefined): number | null {
  if (n == null) return null;
  const value = typeof n === 'string' ? Number(n) : n;
  return Number.isFinite(value) ? value : null;
}

/** Grouped digits plus the currency mark — `1.250.000 đ` (vi) · `1,250,000 ₫` (en). */
function groupedMoney(value: number, lang: Lang): string {
  return `${value.toLocaleString(LANG_LOCALE[lang])} ${translate(formatMessages, lang, 'currencySuffix')}`;
}

/**
 * Compact price for cards and lists: from one million up it reads in millions
 * (`1.5 triệu đ` · `1.5M ₫`), below that the grouped digits. Money stays VND in
 * both languages (I18N-07); only the grouping and the unit word follow `lang`.
 */
export function formatPrice(n: number | string, lang: Lang = 'vi'): string {
  const value = toMoneyNumber(n);
  if (value == null) return '—';
  if (value >= 1_000_000) {
    const amount = (value / 1_000_000).toFixed(1).replace('.0', '');
    return translate(formatMessages, lang, 'priceMillions', { amount });
  }
  return groupedMoney(value, lang);
}

/**
 * Exact VND — full grouped digits, never abbreviated. Use for payment totals,
 * order totals and line items where the precise amount matters.
 */
export function formatVnd(n: number | string, lang: Lang = 'vi'): string {
  const value = toMoneyNumber(n);
  if (value == null) return '—';
  return groupedMoney(value, lang);
}

/**
 * Builds a human-readable variant label from a SKU tier index string and product variations.
 * tierIdxStr: "[0,1]" + variations: [{name:"Màu",options:["Đỏ","Xanh"]},{name:"Size",options:["S","M"]}]
 * → "Đỏ / M"
 */
export function buildVariantLabel(
  tierIdxStr: string | null | undefined,
  variations: Variation[] | null | undefined,
): string | null {
  if (!tierIdxStr || !variations?.length) return null;
  let indices: number[];
  try {
    indices = JSON.parse(tierIdxStr) as number[];
  } catch {
    return null;
  }
  const parts = indices
    .map((optIdx, tierIdx) => variations[tierIdx]?.options[optIdx])
    .filter((v): v is string => v !== undefined);
  return parts.length > 0 ? parts.join(' / ') : null;
}
