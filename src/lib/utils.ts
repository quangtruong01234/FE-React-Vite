import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Variation } from "@/types"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatPrice(n: number): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} triệu đ`;
  return n.toLocaleString('vi-VN') + ' đ';
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
