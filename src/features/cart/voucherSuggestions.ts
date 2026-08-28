import type { AvailableVoucher, VoucherIneligibleReason } from '@/types';
import { toVoucherNumber } from '@/lib/domain/voucherMoney';

/**
 * Pure helpers for the checkout voucher suggestion list (F3 / VOUCHER-SHOP-01).
 *
 * `POST /order/vouchers/available` returns every voucher relevant to the basket
 * already priced against it, with `isEligible` + a machine-readable
 * `ineligibleReason`. The backend sends **no prose** — every string a buyer
 * reads is written here.
 *
 * The response is a hint, not a permission: a row can go stale between the
 * suggestion call and the redeem (someone else takes the last redemption), so
 * picking a row still goes through `/voucher/validate` like a typed-in code.
 */

/** Widest ineligibility copy: reason → what the buyer can do about it. */
const INELIGIBLE_COPY: Record<VoucherIneligibleReason, string> = {
  INACTIVE: 'Mã đã bị tắt.',
  WRONG_SELLER: 'Chỉ áp dụng cho sản phẩm của người bán khác.',
  NOT_ACTIVE_YET: 'Chưa đến thời gian áp dụng.',
  EXPIRED: 'Mã đã hết hạn.',
  MIN_ORDER_NOT_MET: 'Đơn hàng chưa đạt giá trị tối thiểu.',
  FULLY_REDEEMED: 'Mã đã hết lượt sử dụng.',
  USER_LIMIT_REACHED: 'Bạn đã dùng hết lượt của mã này.',
  NO_DISCOUNT: 'Mã không giảm thêm cho đơn này.',
};

/**
 * Why this row is greyed out, in Vietnamese. `MIN_ORDER_NOT_MET` is the only
 * reason the buyer can act on right now, so it upgrades to the concrete
 * "buy N more" line whenever the backend priced the gap (`amountToAdd > 0`).
 *
 * An unknown reason string (a value the backend adds later) must not render as
 * a raw enum, so it collapses to the neutral fallback.
 */
export function voucherIneligibleMessage(
  voucher: Pick<AvailableVoucher, 'ineligibleReason' | 'amountToAdd'>,
  formatMoney: (n: number) => string,
): string {
  const reason = voucher.ineligibleReason;
  if (reason === 'MIN_ORDER_NOT_MET') {
    const gap = toVoucherNumber(voucher.amountToAdd);
    if (gap > 0) return `Mua thêm ${formatMoney(gap)} để dùng mã này.`;
  }
  if (reason != null && reason in INELIGIBLE_COPY) {
    return INELIGIBLE_COPY[reason as VoucherIneligibleReason];
  }
  return 'Chưa dùng được cho đơn này.';
}

/**
 * Scope badge. A shop voucher is measured against that seller's slice of the
 * basket only, so the buyer has to be told which pot the number came from —
 * otherwise a "50.000 đ off" on a 2-seller basket reads as a total-order cut.
 */
export function voucherScopeLabel(
  voucher: Pick<AvailableVoucher, 'scope'>,
): string {
  return voucher.scope === 'shop' ? 'Của người bán' : 'Toàn sàn';
}

/** Discount this row would give on the current basket, as a usable number. */
export function voucherSuggestionDiscount(
  voucher: Pick<AvailableVoucher, 'discountAmount'>,
): number {
  return toVoucherNumber(voucher.discountAmount);
}

/**
 * Best-first ordering. Eligible rows lead, biggest saving first, so the
 * default read of the list is "this is the one to take". Among the greyed-out
 * rows the near-misses (`MIN_ORDER_NOT_MET`) come next — they are the only ones
 * a buyer can convert — and dead codes sink to the bottom, cheapest gap first.
 *
 * Returns a new array; the query cache's data is never mutated.
 */
export function sortVoucherSuggestions(
  vouchers: readonly AvailableVoucher[],
): AvailableVoucher[] {
  return [...vouchers].sort((a, b) => {
    if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
    if (a.isEligible) {
      const diff = voucherSuggestionDiscount(b) - voucherSuggestionDiscount(a);
      if (diff !== 0) return diff;
      return a.code.localeCompare(b.code);
    }
    const aNear = a.ineligibleReason === 'MIN_ORDER_NOT_MET';
    const bNear = b.ineligibleReason === 'MIN_ORDER_NOT_MET';
    if (aNear !== bNear) return aNear ? -1 : 1;
    if (aNear) {
      const gap = toVoucherNumber(a.amountToAdd) - toVoucherNumber(b.amountToAdd);
      if (gap !== 0) return gap;
    }
    return a.code.localeCompare(b.code);
  });
}
