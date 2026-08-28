/**
 * Money coercion shared by every voucher surface (admin console, checkout
 * suggestions). Voucher amounts are DECIMAL columns, so TypeORM may serialize
 * them as `"50000.00"` rather than `50000` — every read path has to survive
 * both, which is why this lives in `lib/` instead of one feature folder.
 */

/**
 * DECIMAL-or-number → finite number. Unlike `formatVnd`'s coercion this folds
 * null/undefined/garbage to `0` rather than `—`: callers here are doing
 * arithmetic and comparisons (is the cap set? is the threshold met?), where a
 * missing amount means "no amount", not "unknown".
 */
export function toVoucherNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}
