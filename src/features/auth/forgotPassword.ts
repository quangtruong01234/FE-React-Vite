import type { ApiError } from '@/types';

/**
 * Pure helpers for the forgot-password flow.
 *
 * Backend contract (2026-07-11 handoff):
 * - `POST /user/forgot-password` `{ email }` → always neutral `201`
 *   (anti-enumeration); malformed email → `400`; rate limit 5/60s → `429`.
 *   Server-side resend cooldown: 60s per account.
 * - `POST /user/reset-password` `{ email, code, newPassword }` → `201 { success }`.
 *   Four of the five verification failures (wrong code, expired code, unknown
 *   email, no code ever requested) share the SAME `400 "Invalid or expired
 *   verification code"` by design — splitting them would turn this endpoint
 *   into an account prober. Rate limit 10/60s → `429`. The code is 6 digits,
 *   single-use, and short-lived (the exact TTL is the server's to state — the
 *   email says it; see RESET-TTL-01).
 *
 * The fifth cause is the one the response DOES name (MAIL-UI-01): after 5 wrong
 * attempts the server destroys the code and tags every later attempt with
 * `errorCode: RESET_CODE_EXHAUSTED` — including an attempt that types the old
 * code correctly, because that code is genuinely dead. The tag survives reloads
 * and other tabs (the server records it, we do not count), and clears only when
 * a new code is actually sent. See `isResetCodeExhausted`.
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

/** The server destroyed the code after too many wrong attempts (MAIL-UI-01). */
const RESET_CODE_EXHAUSTED = 'RESET_CODE_EXHAUSTED';

/**
 * True when the server says this code is dead for good. Only an explicit
 * `errorCode` counts: an untagged 400 is one of the four pooled causes, where
 * re-reading the email is still worth a try.
 */
export function isResetCodeExhausted(error: unknown): boolean {
  return (error as ApiError | undefined)?.errorCode === RESET_CODE_EXHAUSTED;
}

/**
 * Friendly message for a failed reset-password request.
 *
 * The exhausted case gets its own copy because it is the one failure where
 * retrying is pointless — no code the user can type will work until they ask
 * for a new one. Every other 400 stays pooled behind the shared message, since
 * the backend deliberately does not say which of the four it was. Client-side
 * zod prevents the DTO-shaped 400s from ever being sent.
 */
export function resetPasswordErrorMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 429) return RATE_LIMIT_MESSAGE;
  if (isResetCodeExhausted(error)) {
    return 'Bạn đã nhập sai quá nhiều lần — mã này không còn dùng được. Hãy bấm "Gửi lại mã" để nhận mã mới.';
  }
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

// The client-side attempt counter that used to live here (`nextResetAttempts` /
// `resetAttemptHint`, MAIL-UI-01 first draft) is deliberately gone: it guessed
// at server state it could not see — it only ever counted what one tab sent, so
// a reload, a second tab, or a resend from elsewhere desynced it. The server now
// answers with `RESET_CODE_EXHAUSTED` instead. Do not reintroduce a "còn N lần"
// countdown either: the backend does not return the remaining count, on purpose,
// because that is another way to probe an account.
