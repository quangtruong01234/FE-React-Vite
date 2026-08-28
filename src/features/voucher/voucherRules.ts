import type { ApiError, CreateVoucherDto, UpdateVoucherDto, Voucher } from '@/types';
import { formatVnd } from '@/lib/format/utils';
import { toVoucherNumber } from '@/lib/domain/voucherMoney';
import type { VoucherFormData } from './voucherRules.schema';

/**
 * Pure helpers for the voucher console (F3-ADMIN), shared by the platform-wide
 * admin screen and the seller's own-vouchers screen.
 *
 * Backend contract, in both role flavours (`/order/admin/vouchers` for admins,
 * `/order/vouchers` + `/order/vouchers/mine` for shops): create 409s on a
 * duplicate code, the list pages newest-first, `…/:id/deactivate` flips
 * `isActive` to false, and since VOUCHER-EDIT-01 `PATCH …/:id` edits a voucher —
 * including switching a deactivated one back on with `{ isActive: true }`. The
 * *rules* are identical either side, which is why none of this knows the role;
 * only the URLs and the meaning of a 403 differ, and those live in the binding.
 *
 * Money columns are DECIMAL, so they can arrive as strings ("50000.00");
 * everything here coerces with `toVoucherNumber` before comparing or formatting.
 */

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

/** Deactivate is only offered while the code can still be redeemed. */
export function canDeactivateVoucher(voucher: Pick<Voucher, 'isActive'>): boolean {
  return voucher.isActive;
}

/**
 * The mirror of `canDeactivateVoucher`. Since VOUCHER-EDIT-01 an off voucher
 * can be switched back on with `PATCH /vouchers/:id { isActive: true }` — it is
 * no longer a one-way door, so the row offers the way back.
 */
export function canReactivateVoucher(voucher: Pick<Voucher, 'isActive'>): boolean {
  return !voucher.isActive;
}

export type VoucherConsoleAction = 'list' | 'create' | 'deactivate' | 'update';

/** What a 401/403 means when only the role is checked. */
export const VOUCHER_FORBIDDEN_DEFAULT = 'Bạn không có quyền quản lý mã giảm giá.';

/**
 * Friendly message for a voucher console call. 409 is the duplicate-code guard
 * on create, and 400 carries the backend's own validation text — surface it
 * rather than swallowing it, since it names the exact rule that failed.
 *
 * 403 is the one status whose meaning is role-dependent, hence `forbidden`: on
 * the admin routes it can only mean "not an admin", but the shop routes are
 * *also* ownership-gated and their 403 deliberately does not echo the code, so
 * the seller wording has to cover both readings without leaking whose it is.
 */
export function voucherConsoleErrorMessage(
  error: unknown,
  action: VoucherConsoleAction,
  forbidden: string = VOUCHER_FORBIDDEN_DEFAULT,
): string {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  if (status === 401 || status === 403) return forbidden;
  if (status === 409) return 'Mã này đã tồn tại. Hãy chọn một mã khác.';
  if (status === 404) return 'Không tìm thấy mã giảm giá này.';
  if (status === 400 && message) return message;
  if (message) return message;
  const fallbackByAction: Record<VoucherConsoleAction, string> = {
    list: 'Không tải được danh sách mã giảm giá. Vui lòng thử lại.',
    create: 'Không tạo được mã giảm giá. Vui lòng thử lại.',
    deactivate: 'Không tắt được mã giảm giá. Vui lòng thử lại.',
    update: 'Không lưu được thay đổi. Vui lòng thử lại.',
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

/* ── VOUCHER-EDIT-01 ────────────────────────────────────────────────────────
 * `PATCH /order/admin/vouchers/:id` is a true partial update with three
 * distinct meanings per key: **omit** = leave alone, **null** = clear,
 * **value** = set. Sending the whole form back would silently rewrite fields
 * the admin never touched, so everything below is a diff against the row.
 *
 * `code` / `discountType` / `discountValue` / `sellerId` are immutable and are
 * rejected outright (`property … should not exist`), so they never appear in a
 * payload built here.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Inverse of `localInputToIso` — ISO → the local wall-clock `datetime-local` wants. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Copy for the active/inactive toggle in the voucher form.
 *
 * Both strings used to be hard-coded to the "on" wording in edit mode, so
 * opening a **deactivated** voucher showed "Đang bật" next to a switch that was
 * off, and screen readers got the accessible name "Mã đang được bật" for an
 * unchecked switch. The accessible name must be **stable** — the switch role
 * already announces checked/unchecked — while the visible text is the thing
 * that carries the state.
 */
export function voucherActiveToggleCopy(
  isEdit: boolean,
  isActive: boolean,
): { label: string; state: string } {
  if (!isEdit) {
    return { label: 'Kích hoạt mã ngay sau khi tạo', state: 'Kích hoạt ngay' };
  }
  return { label: 'Trạng thái mã', state: isActive ? 'Đang bật' : 'Đã tắt' };
}

/** Existing row → edit-form state. DECIMAL strings ("10.00") become "10". */
export function voucherToFormData(voucher: Voucher): VoucherFormData {
  const amount = (value: number | string | null | undefined): string =>
    value == null ? '' : String(toVoucherNumber(value));
  return {
    code: voucher.code,
    description: voucher.description ?? '',
    discountType: voucher.discountType,
    discountValue: amount(voucher.discountValue),
    minOrderAmount: amount(voucher.minOrderAmount),
    maxDiscountAmount: amount(voucher.maxDiscountAmount),
    usageLimit: voucher.usageLimit == null ? '' : String(voucher.usageLimit),
    perUserLimit: voucher.perUserLimit == null ? '' : String(voucher.perUserLimit),
    startsAt: isoToLocalInput(voucher.startsAt),
    expiresAt: isoToLocalInput(voucher.expiresAt),
    isActive: voucher.isActive,
  };
}

/** `undefined` = unchanged (omit the key), `null` = the admin cleared the field. */
function diffOptionalNumber(
  raw: string,
  current: number | string | null | undefined,
): number | null | undefined {
  const next = optionalNumber(raw);
  if (next === undefined) return current == null ? undefined : null;
  if (current != null && toVoucherNumber(current) === next) return undefined;
  return next;
}

/**
 * `minOrderAmount` needs its own diff because it is the one amount the backend
 * cannot take a `null` for: the column is `NOT NULL DEFAULT 0` and the handler
 * runs `input.minOrderAmount.toFixed(2)` unguarded, so a cleared field sent as
 * `null` is a **500**, not a 400 (`@IsOptional()` waves `null` through the
 * validation pipe). Emptying the box means "no minimum", which on this column
 * is `0` — and when the stored value is already 0 there is nothing to send.
 */
function diffMinOrderAmount(
  raw: string,
  current: number | string | null | undefined,
): number | undefined {
  const next = optionalNumber(raw) ?? 0;
  return toVoucherNumber(current) === next ? undefined : next;
}

function diffOptionalDate(
  raw: string,
  current: string | null | undefined,
): string | null | undefined {
  // The field is seeded with `isoToLocalInput(current)`, and `datetime-local`
  // only carries minutes — anything finer in `current` cannot survive the round
  // trip. Prod rows really do end at `…23:59:59.000Z`, so comparing the rebuilt
  // ISO against the raw one made merely *opening* the form read as a 59-second
  // edit: a no-op save was refused as a tightening of "Thời gian kết thúc", and
  // on a voucher with no redemptions it would have quietly moved the expiry
  // earlier. Compare against the seeded string instead.
  if (raw === isoToLocalInput(current)) return undefined;
  const next = localInputToIso(raw);
  if (next === undefined) return current == null ? undefined : null;
  return next;
}

/**
 * Form state → patch payload, containing **only** what actually changed. An
 * empty object is a legal no-op server-side, but the page treats it as "nothing
 * to save" rather than spending a request — see `hasVoucherEdits`.
 */
export function buildUpdateVoucherDto(
  form: VoucherFormData,
  original: Voucher,
): UpdateVoucherDto {
  const dto: UpdateVoucherDto = {};

  const description = form.description.trim();
  if (description !== (original.description ?? '')) {
    dto.description = description === '' ? null : description;
  }

  const minOrderAmount = diffMinOrderAmount(form.minOrderAmount, original.minOrderAmount);
  if (minOrderAmount !== undefined) dto.minOrderAmount = minOrderAmount;

  // A cap is meaningless on a fixed voucher, exactly as on create.
  if (original.discountType === 'percent') {
    const maxDiscountAmount = diffOptionalNumber(
      form.maxDiscountAmount,
      original.maxDiscountAmount,
    );
    if (maxDiscountAmount !== undefined) dto.maxDiscountAmount = maxDiscountAmount;
  }

  const usageLimit = diffOptionalNumber(form.usageLimit, original.usageLimit);
  if (usageLimit !== undefined) dto.usageLimit = usageLimit;

  const perUserLimit = diffOptionalNumber(form.perUserLimit, original.perUserLimit);
  if (perUserLimit !== undefined) dto.perUserLimit = perUserLimit;

  const startsAt = diffOptionalDate(form.startsAt, original.startsAt);
  if (startsAt !== undefined) dto.startsAt = startsAt;

  const expiresAt = diffOptionalDate(form.expiresAt, original.expiresAt);
  if (expiresAt !== undefined) dto.expiresAt = expiresAt;

  if (form.isActive !== original.isActive) dto.isActive = form.isActive;

  return dto;
}

/** `{}` is accepted by the backend but there is nothing to send. */
export function hasVoucherEdits(dto: UpdateVoucherDto): boolean {
  return Object.keys(dto).length > 0;
}

/**
 * The fields whose limits this patch makes **stricter**, in the backend's own
 * terms: a higher minimum, a smaller cap/limit, a later start or an earlier
 * end. `null` is the loosest possible value everywhere (no minimum, no cap, no
 * limit, no window), which is why it never counts as tightening.
 */
export function voucherTighteningFields(
  dto: UpdateVoucherDto,
  original: Voucher,
): string[] {
  const fields: string[] = [];

  if (dto.minOrderAmount !== undefined) {
    // Never null (see `diffMinOrderAmount`); 0 is the loosest value.
    if (dto.minOrderAmount > toVoucherNumber(original.minOrderAmount)) {
      fields.push('Đơn tối thiểu');
    }
  }
  if (dto.maxDiscountAmount !== undefined) {
    const next = dto.maxDiscountAmount ?? Infinity;
    const current =
      original.maxDiscountAmount == null
        ? Infinity
        : toVoucherNumber(original.maxDiscountAmount);
    if (next < current) fields.push('Giảm tối đa');
  }
  if (dto.usageLimit !== undefined) {
    if ((dto.usageLimit ?? Infinity) < (original.usageLimit ?? Infinity)) {
      fields.push('Tổng lượt dùng');
    }
  }
  if (dto.perUserLimit !== undefined) {
    if ((dto.perUserLimit ?? Infinity) < (original.perUserLimit ?? Infinity)) {
      fields.push('Lượt mỗi người');
    }
  }
  if (dto.startsAt !== undefined) {
    const next = dto.startsAt == null ? -Infinity : new Date(dto.startsAt).getTime();
    const current = original.startsAt ? new Date(original.startsAt).getTime() : -Infinity;
    if (next > current) fields.push('Thời gian bắt đầu');
  }
  if (dto.expiresAt !== undefined) {
    const next = dto.expiresAt == null ? Infinity : new Date(dto.expiresAt).getTime();
    const current = original.expiresAt ? new Date(original.expiresAt).getTime() : Infinity;
    if (next < current) fields.push('Thời gian kết thúc');
  }

  return fields;
}

/**
 * Client-side mirror of the 400s this patch can hit, so the admin is told the
 * rule before the request rather than after it. Returns the message to show, or
 * null when the patch is allowed.
 */
export function voucherEditBlockedMessage(
  dto: UpdateVoucherDto,
  original: Voucher,
): string | null {
  if (dto.usageLimit != null && dto.usageLimit < original.usedCount) {
    return `Tổng lượt dùng không thể nhỏ hơn số lượt đã dùng (${original.usedCount}).`;
  }
  // VOUCHER-GUARD-01, re-checked server-side on every patch that carries a
  // minimum: a fixed voucher worth at least its own threshold zeroes the goods
  // cost of every basket. Unlike the rules below it does not care about
  // `usedCount` — and it fires on a *cleared* minimum too, because "no minimum"
  // is 0 and every fixed discount is worth more than that.
  if (dto.minOrderAmount !== undefined && original.discountType === 'fixed') {
    const discountValue = toVoucherNumber(original.discountValue);
    if (discountValue >= dto.minOrderAmount) {
      return `Mã giảm tiền cố định phải có đơn tối thiểu lớn hơn số tiền giảm (${formatVnd(discountValue)}).`;
    }
  }
  if (original.usedCount === 0) return null;
  const tightened = voucherTighteningFields(dto, original);
  if (tightened.length === 0) return null;
  return `Mã đã được dùng ${original.usedCount} lần nên chỉ có thể nới lỏng điều kiện. Không thể siết: ${tightened.join(', ')}.`;
}

/** Constrained fields — the ones the backend one-ways once a voucher is used. */
const CONSTRAINED_FIELDS = [
  'minOrderAmount',
  'maxDiscountAmount',
  'usageLimit',
  'perUserLimit',
  'startsAt',
  'expiresAt',
] as const satisfies readonly (keyof UpdateVoucherDto)[];

/**
 * Loosening a redeemed voucher cannot be walked back — the backend will refuse
 * to tighten it again, forever. That deserves a confirm, so this returns the
 * question to ask (or null when the edit is freely reversible).
 */
export function voucherLooseningConfirm(
  dto: UpdateVoucherDto,
  original: Voucher,
): string | null {
  if (original.usedCount === 0) return null;
  const changed = CONSTRAINED_FIELDS.filter((field) => dto[field] !== undefined);
  if (changed.length === 0) return null;
  return `Mã "${original.code}" đã được dùng ${original.usedCount} lần. Nới lỏng điều kiện là thay đổi một chiều — sau này không siết lại được. Tiếp tục?`;
}
