import type { ApiError } from '@/types';

/**
 * Pure helpers for the forgot-password flow.
 *
 * Backend contract (2026-07-11 handoff):
 * - `POST /user/forgot-password` `{ email }` → always neutral `201`
 *   (anti-enumeration); malformed email → `400`; rate limit 5/60s → `429`.
 *   Server-side resend cooldown: 60s per account.
 * - `POST /user/reset-password` `{ email, code, newPassword }` → `201 { success }`.
 *   Every verification failure (wrong/expired code, unknown email, too many
 *   attempts) is the SAME `400 "Invalid or expired verification code"` by
 *   design; rate limit 10/60s → `429`. Code: 6 digits, valid 10 min, single-use.
 */

export const RESEND_COOLDOWN_SECONDS = 60;

function statusOf(error: unknown): number | undefined {
  const err = error as ApiError | undefined;
  return err?.statusCode ?? err?.status;
}

const RATE_LIMIT_MESSAGE = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
const CONNECTION_MESSAGE = 'Không thể kết nối đến máy chủ. Vui lòng thử lại.';

/** Friendly message for a failed forgot-password (send code) request. */
export function forgotPasswordErrorMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 429) return RATE_LIMIT_MESSAGE;
  if (status === 400) return 'Email không hợp lệ.';
  return CONNECTION_MESSAGE;
}

/**
 * Friendly message for a failed reset-password request. All verification
 * failures arrive as the same 400 (indistinguishable by design), so every 400
 * maps to the invalid/expired-code message — client-side zod validation
 * prevents the DTO-shaped 400s from ever being sent.
 */
export function resetPasswordErrorMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 429) return RATE_LIMIT_MESSAGE;
  if (status === 400) {
    return 'Mã xác nhận không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại hoặc gửi lại mã.';
  }
  return CONNECTION_MESSAGE;
}

/**
 * Whole seconds left on the resend cooldown; 0 when expired or never started.
 * Pure — callers pass `Date.now()` so the countdown is testable.
 */
export function resendCooldownRemaining(cooldownUntil: number | null, now: number): number {
  if (cooldownUntil === null) return 0;
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
}
