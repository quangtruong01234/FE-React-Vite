import type { ApiError, VoucherScope, VoucherValidation, ValidatedVoucher } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { checkoutMessages } from './checkout.i18n';
import { unavailableProductId } from './checkoutItems';

/**
 * Pure helpers for the checkout voucher flow (F3).
 *
 * Backend contract: `POST /order/voucher/validate` previews codes against the
 * basket without redeeming; `POST /order` redeems them. Codes are
 * case-insensitive (normalized to uppercase server-side). Since VOUCHER-SHOP-01
 * phase 2 a checkout stacks at most 1 platform code + 1 code per shop: shop
 * codes price on that shop's slice, the platform code on what is left after
 * them, and shipping is never discounted.
 */

/** Codes are case-insensitive server-side; normalize before sending/comparing. */
export function normalizeVoucherCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Validate body for a set of codes. One code still goes out as the legacy
 * `code` so a backend that predates `voucherCodes` keeps working; only a real
 * stack needs the new field.
 */
export function voucherValidateCodes(
  codes: readonly string[],
): { code: string } | { voucherCodes: string[] } {
  return codes.length === 1 ? { code: codes[0] } : { voucherCodes: [...codes] };
}

/** Create-order counterpart of `voucherValidateCodes`; no codes → no key at all. */
export function voucherCreateCodes(
  codes: readonly string[],
): { voucherCode?: string; voucherCodes?: string[] } {
  if (codes.length === 0) return {};
  return codes.length === 1 ? { voucherCode: codes[0] } : { voucherCodes: [...codes] };
}

/** An applied code; `scope: null` when a pre-phase-2 backend did not say. */
export type AppliedVoucherRow = Omit<ValidatedVoucher, 'scope'> & { scope: VoucherScope | null };

/** Which stacking slot a code occupies: the single platform slot, or one per shop. */
export interface VoucherSlot {
  scope: VoucherScope;
  sellerId: string | null;
}

function sameSlot(a: AppliedVoucherRow, b: VoucherSlot): boolean {
  return a.scope === b.scope && (a.scope === 'platform' || a.sellerId === b.sellerId);
}

/**
 * The code list to validate when the buyer adds `code` to what is applied.
 * A code whose slot is known (picked from the suggestion list) replaces the one
 * already holding that slot — picking a second platform code swaps it rather
 * than earning a guaranteed 400. An unknown slot (typed by hand, not in the
 * list) is simply appended and the backend decides.
 */
export function nextVoucherCodes(
  applied: readonly AppliedVoucherRow[],
  code: string,
  slot?: VoucherSlot,
): string[] {
  if (applied.some((v) => v.code === code)) return applied.map((v) => v.code);
  const kept = slot ? applied.filter((v) => !sameSlot(v, slot)) : applied;
  return [...kept.map((v) => v.code), code];
}

/**
 * Per-code rows of a validation. A backend that predates phase 2 sends no
 * `vouchers`, so its single code becomes one row with an unknown scope.
 */
export function appliedVoucherRows(
  validation: VoucherValidation,
): AppliedVoucherRow[] {
  if (validation.vouchers && validation.vouchers.length > 0) return validation.vouchers;
  return [
    {
      code: validation.code,
      scope: null,
      sellerId: null,
      discountType: validation.discountType,
      discountAmount: validation.discountAmount,
    },
  ];
}

/** Backend computes `total = itemsTotal - discount + shippingFee`; mirror it for the preview. */
export function discountedGrandTotal(
  itemsTotal: number,
  discountAmount: number,
  shippingFee: number,
): number {
  return Math.max(0, itemsTotal - discountAmount) + shippingFee;
}

// Messages name the failing code ("Voucher SALE10 has expired", "… to use
// voucher SALE10"). Codes are uppercase, which keeps the old code-less wording
// ("Voucher not found") from being read as a code named "not".
const CODE_IN_MESSAGE = /\b[Vv]oucher ([A-Z0-9][A-Z0-9_-]*)\b/;

/**
 * Friendly message for a failed voucher validate/redeem. 404 = unknown or
 * inactive code; 400/409 carry the rejection reason as English prose, matched
 * by keyword with the code stripped out first (a code like `MINUS10` must not
 * read as "min order"). Unmatched → the raw server message.
 */
export function voucherErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const t = bindTranslator(checkoutMessages, lang);
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  const code = CODE_IN_MESSAGE.exec(message)?.[1];
  const subject = code ? t('voucherSubjectCode', { code }) : t('voucherSubjectGeneric');
  // CHECKOUT-INACTIVE-01: the basket is at fault, not the code.
  if (unavailableProductId(error)) return t('orderItemUnavailable');
  if (status === 404) return t('voucherNotFound', { subject });
  if (status === 400 || status === 409) {
    const m = (code ? message.split(code).join('') : message).toLowerCase();
    if (m.includes('just been fully redeemed')) return t('voucherJustRedeemed', { subject });
    if (m.includes('one platform voucher')) return t('voucherOnePlatform');
    if (m.includes('same shop')) return t('voucherOnePerShop');
    if (m.includes('only applies to items from the shop')) {
      return t('voucherWrongShop', { subject });
    }
    if (m.includes('expired')) return t('voucherExpired', { subject });
    if (m.includes('not started') || m.includes('not yet') || m.includes('not active yet')) {
      return t('voucherNotStarted', { subject });
    }
    if (m.includes('min') || m.includes('at least')) {
      const target = code ? t('voucherTargetCode', { code }) : t('voucherTargetThis');
      return t('voucherMinOrder', { target });
    }
    if (m.includes('per-user') || m.includes('per user') || m.includes('already')) {
      return code ? t('voucherUserLimitCode', { code }) : t('voucherUserLimit');
    }
    if (m.includes('fully redeemed') || m.includes('usage') || m.includes('limit')) {
      return t('voucherUsedUp', { subject });
    }
    if (m.includes('no discount')) return t('voucherNoDiscount', { subject });
    // Legacy backend (before phase 2): any code on a multi-seller basket → 400.
    if (m.includes('seller') || m.includes('multi')) {
      return t('voucherSingleSeller');
    }
  }
  return message || t('voucherFailed');
}
