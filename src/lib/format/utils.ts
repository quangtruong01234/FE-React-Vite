import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Variation } from "@/types"

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

export function formatPrice(n: number | string): string {
  const value = toMoneyNumber(n);
  if (value == null) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.0', '')} triệu đ`;
  return value.toLocaleString('vi-VN') + ' đ';
}

/**
 * Exact VND — full grouped digits, never abbreviated. Use for payment totals,
 * order totals and line items where the precise amount matters.
 */
export function formatVnd(n: number | string): string {
  const value = toMoneyNumber(n);
  if (value == null) return '—';
  return value.toLocaleString('vi-VN') + ' đ';
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
