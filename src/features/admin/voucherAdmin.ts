import type { ApiError, CreateVoucherDto, Voucher } from '@/types';
import type { VoucherFormData } from './voucherAdmin.schema';

/**
 * Pure helpers for the admin voucher console (F3-ADMIN).
 *
 * Backend contract: `POST /order/admin/vouchers` creates (409 on a duplicate
 * code), `GET /order/admin/vouchers` pages the list newest-first, and
 * `PATCH /order/admin/vouchers/:id/deactivate` flips `isActive` to false. There
 * is **no update and no reactivate endpoint** — deactivation is one-way, so a
 * mistyped voucher is replaced by creating a new code, not by editing.
 *
 * Money columns are DECIMAL, so they can arrive as strings ("50000.00");
 * everything here coerces with `Number()` before comparing or formatting.
 */

/** DECIMAL columns arrive as `number` or `"50000.00"` — normalize before math. */
export function toVoucherNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

export type VoucherStatusKind =
  | 'inactive'
  | 'expired'
  | 'used_up'
  | 'scheduled'
  | 'active';

export interface VoucherStatusMeta {
  kind: VoucherStatusKind;
  label: string;
  className: string;
}

/**
 * Why a voucher would (or would not) apply right now, in the same precedence
 * the backend validates in: an explicitly deactivated code reports as such even
 * if it is also expired, so the admin sees the state they can act on.
 */
export function voucherStatusMeta(
  voucher: Pick<Voucher, 'isActive' | 'startsAt' | 'expiresAt' | 'usageLimit' | 'usedCount'>,
  now: number = Date.now(),
): VoucherStatusMeta {
  if (!voucher.isActive) {
    return { kind: 'inactive', label: 'Đã tắt', className: 'bg-canvas-elevated text-ink-muted border-bdr' };
  }
  const expiresAt = voucher.expiresAt ? new Date(voucher.expiresAt).getTime() : null;
  if (expiresAt !== null && Number.isFinite(expiresAt) && now > expiresAt) {
    return { kind: 'expired', label: 'Hết hạn', className: 'bg-accent-red/15 text-accent-red border-accent-red/30' };
  }
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    return { kind: 'used_up', label: 'Hết lượt', className: 'bg-accent-red/15 text-accent-red border-accent-red/30' };
  }
  const startsAt = voucher.startsAt ? new Date(voucher.startsAt).getTime() : null;
  if (startsAt !== null && Number.isFinite(startsAt) && now < startsAt) {
    return { kind: 'scheduled', label: 'Chưa bắt đầu', className: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30' };
  }
  return { kind: 'active', label: 'Đang chạy', className: 'bg-accent-green/15 text-accent-green border-accent-green/30' };
}

/** "10%" · "10% (tối đa 50.000 đ)" · "50.000 đ" — formatting stays in the page. */
export function voucherDiscountLabel(
  voucher: Pick<Voucher, 'discountType' | 'discountValue' | 'maxDiscountAmount'>,
  formatMoney: (n: number) => string,
): string {
  const value = toVoucherNumber(voucher.discountValue);
  if (voucher.discountType === 'fixed') return formatMoney(value);
  const cap = voucher.maxDiscountAmount != null ? toVoucherNumber(voucher.maxDiscountAmount) : null;
  return cap != null && cap > 0 ? `${value}% (tối đa ${formatMoney(cap)})` : `${value}%`;
}

/** "3 / 100" · "3 / ∞" — a null `usageLimit` means unlimited, not zero. */
export function voucherUsageLabel(
  voucher: Pick<Voucher, 'usedCount' | 'usageLimit'>,
): string {
  return `${voucher.usedCount} / ${voucher.usageLimit ?? '∞'}`;
}

/**
 * Validity window as a single cell. Both ends are optional server-side, so an
 * open window renders "Không giới hạn" instead of a half-empty range.
 */
export function voucherWindowLabel(
  voucher: Pick<Voucher, 'startsAt' | 'expiresAt'>,
  formatWhen: (iso: string) => string,
): string {
  const from = voucher.startsAt ? formatWhen(voucher.startsAt) : '';
  const to = voucher.expiresAt ? formatWhen(voucher.expiresAt) : '';
  if (!from && !to) return 'Không giới hạn';
  if (from && !to) return `Từ ${from}`;
  if (!from && to) return `Đến ${to}`;
  return `${from} → ${to}`;
}

/** A one-way deactivate is only offered while the code can still be redeemed. */
export function canDeactivateVoucher(voucher: Pick<Voucher, 'isActive'>): boolean {
  return voucher.isActive;
}

export type VoucherAdminAction = 'list' | 'create' | 'deactivate';

/**
 * Friendly message for an admin voucher call. 403 means the account is not an
 * admin (the routes are `:any`-scoped), 409 is the duplicate-code guard on
 * create, and 400 carries the backend's own validation text — surface it rather
 * than swallowing it, since it names the exact rule that failed.
 */
export function voucherAdminErrorMessage(
  error: unknown,
  action: VoucherAdminAction,
): string {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  if (status === 401 || status === 403) return 'Bạn không có quyền quản lý mã giảm giá.';
  if (status === 409) return 'Mã này đã tồn tại. Hãy chọn một mã khác.';
  if (status === 404) return 'Không tìm thấy mã giảm giá này.';
  if (status === 400 && message) return message;
  if (message) return message;
  const fallbackByAction: Record<VoucherAdminAction, string> = {
    list: 'Không tải được danh sách mã giảm giá. Vui lòng thử lại.',
    create: 'Không tạo được mã giảm giá. Vui lòng thử lại.',
    deactivate: 'Không tắt được mã giảm giá. Vui lòng thử lại.',
  };
  return fallbackByAction[action];
}

/**
 * `<input type="datetime-local">` gives a zone-less "2026-08-20T10:00", which
 * the backend wants as ISO-8601 UTC. `new Date()` reads it in the admin's local
 * zone — the intended reading, since they typed a local wall-clock time.
 * Returns undefined for a blank or unparseable value so the key is omitted.
 */
export function localInputToIso(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const ms = new Date(trimmed).getTime();
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/** Blank optional numeric field → undefined (omit the key), never 0. */
export function optionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Form state → create payload. Optional fields are **omitted** when blank
 * (backend reads a missing key as unlimited/no-window; an explicit `null` is a
 * 400), and `maxDiscountAmount` is dropped for fixed vouchers where a cap is
 * meaningless.
 */
export function buildCreateVoucherDto(form: VoucherFormData): CreateVoucherDto {
  const description = form.description.trim();
  const minOrderAmount = optionalNumber(form.minOrderAmount);
  const maxDiscountAmount = optionalNumber(form.maxDiscountAmount);
  const usageLimit = optionalNumber(form.usageLimit);
  const perUserLimit = optionalNumber(form.perUserLimit);
  const startsAt = localInputToIso(form.startsAt);
  const expiresAt = localInputToIso(form.expiresAt);

  return {
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue.trim()),
    isActive: form.isActive,
    ...(description ? { description } : {}),
    ...(minOrderAmount !== undefined ? { minOrderAmount } : {}),
    ...(form.discountType === 'percent' && maxDiscountAmount !== undefined
      ? { maxDiscountAmount }
      : {}),
    ...(usageLimit !== undefined ? { usageLimit } : {}),
    ...(perUserLimit !== undefined ? { perUserLimit } : {}),
    ...(startsAt ? { startsAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  };
}
