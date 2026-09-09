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
 *
 * MAIL-UI-01 handoff (2026-08-29) added two facts the response never carries:
 * after 5 wrong attempts the code is destroyed server-side with no change in
 * the message, and a successful resend overwrites the previous code (only the
 * newest email works). Both are surfaced client-side — see `resetAttemptHint`.
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

/** Wrong-code attempts after which we start warning the user (MAIL-UI-01). */
export const RESET_ATTEMPTS_BEFORE_HINT = 3;
/** Server destroys the code after this many wrong attempts — silently. */
export const RESET_ATTEMPT_LIMIT = 5;

/**
 * Attempt counter for the reset step. Only a `400` is a wrong/expired code —
 * a `429` or a dead connection never reached the verification, so counting it
 * would push the user toward asking for a new code they don't need.
 */
export function nextResetAttempts(current: number, error: unknown): number {
  return statusOf(error) === 400 ? current + 1 : current;
}

/**
 * Warning to show above the reset form. The backend answers all five failure
 * causes with the same `400` and, after `RESET_ATTEMPT_LIMIT` wrong attempts,
 * destroys the code server-side **without changing the message** — from then on
 * the user is stuck no matter what they type. So the client counts its own
 * failures and says out loud what the response never will. Deliberately vague
 * about the exact number left: this counter only tracks what THIS tab sent, and
 * a resend (from anywhere) resets the server's counter.
 */
export function resetAttemptHint(failedAttempts: number): string | null {
  if (failedAttempts >= RESET_ATTEMPT_LIMIT) {
    return 'Bạn đã nhập sai quá nhiều lần — mã này không còn dùng được. Hãy bấm "Gửi lại mã" để nhận mã mới.';
  }
  if (failedAttempts >= RESET_ATTEMPTS_BEFORE_HINT) {
    return 'Nhập sai quá nhiều lần sẽ phải xin mã mới. Hãy kiểm tra lại mã trong email mới nhất, hoặc bấm "Gửi lại mã".';
  }
  return null;
}
