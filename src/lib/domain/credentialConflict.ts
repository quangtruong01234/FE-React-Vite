import type { ApiError } from '@/types';

export interface CredentialConflict {
  /** Form field the message belongs to; `null` → the form-level banner. */
  field: 'username' | 'email' | null;
  message: string;
}

/**
 * Classifies a failed register / profile-update into "which field is taken" +
 * "what to tell the user".
 *
 * Backend contract (2026-08-06): a duplicate credential is a `409` — previously
 * both cases were `500 "Database operation failed"`, so the form had no way to
 * say which field to fix.
 *  - `POST /api/user/register` → `"Username is already taken"` or
 *    `"Email is already registered"`.
 *  - `PATCH /api/user/:id` → `"Email is already registered"` (re-submitting the
 *    user's OWN unchanged email stays `200`, so this is never a false conflict).
 *
 * Match on `statusCode` + `message`: the envelope's `error` field still reads
 * `"HttpException"` rather than `"Conflict"` (backend known issue #5).
 */
export function credentialConflictError(error: unknown, fallback: string): CredentialConflict {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  // Only a real backend failure has a message worth showing. A network-level
  // throw is a `TypeError("Failed to fetch")` — English, and meaningless here.
  const raw = status !== undefined && typeof err?.message === 'string' ? err.message.trim() : '';

  if (status === 409) {
    if (/username/i.test(raw)) {
      return {
        field: 'username',
        message: 'Tên đăng nhập này đã có người dùng. Hãy chọn tên khác.',
      };
    }
    if (/email/i.test(raw)) {
      return {
        field: 'email',
        message: 'Email này đã được đăng ký. Hãy dùng email khác hoặc đăng nhập.',
      };
    }
  }

  // Anything else: the backend message names the problem better than we can.
  return { field: null, message: raw.length > 0 ? raw : fallback };
}
