import { z } from 'zod';
import type { ApiError, ChangePasswordDto } from '@/types';

/**
 * Schema + pure helpers for the signed-in change-password form.
 *
 * Backend contract (CHG-PW-01, refined by CHG-PW-02), confirmed against the gateway:
 * - `POST /user/change-password` `{ currentPassword, newPassword }`, JWT cookie
 *   identifies the account → `201 { success: true }`. The cookie is left alone
 *   on every outcome, so the session survives both success and failure.
 * - `401` → two different causes that production cannot tell apart by `message`:
 *   the supplied current password is wrong (`INVALID_CURRENT_PASSWORD`) or the
 *   session is dead (`UNAUTHENTICATED`). Both arrive byte-identical apart from
 *   `errorCode`, so that field is the only discriminator — see
 *   `changePasswordError`. The call sets `skipUnauthorizedRedirect` because the
 *   common case is NOT a dead session.
 * - `400` → DTO validation (new password shorter than 6 chars, equal to the
 *   current one, or an unwhitelisted field in the body). Client-side zod
 *   prevents the first two, so a 400 means the server rejected something the
 *   form did not catch. Carries no `errorCode`.
 * - `429` → rate limit (5 attempts / 60s).
 */

// Mirrors the reset-password rule (min 6) so both paths accept the same
// passwords — a stricter rule here would reject passwords the reset flow sets.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Narrows the three form fields down to the two the endpoint accepts.
 * `confirmPassword` is form-only — the gateway validates with
 * `forbidNonWhitelisted`, so sending it turns a valid change into a 400.
 */
export function changePasswordPayload(data: ChangePasswordFormData): ChangePasswordDto {
  return { currentPassword: data.currentPassword, newPassword: data.newPassword };
}

function statusOf(error: unknown): number | undefined {
  const err = error as ApiError | undefined;
  return err?.statusCode ?? err?.status;
}

function errorCodeOf(error: unknown): string | undefined {
  return (error as ApiError | undefined)?.errorCode;
}

/**
 * True for the two responses this endpoint answers an auth problem with. Which
 * of the two causes it was is `errorCode`'s job, not this function's.
 */
export function isAuthFailure(error: unknown): boolean {
  const status = statusOf(error);
  return status === 401 || status === 403;
}

/** The session is really gone — as opposed to a mistyped current password. */
const UNAUTHENTICATED = 'UNAUTHENTICATED';

/** Which form field a failed change-password response belongs to. */
export type ChangePasswordErrorField = 'currentPassword' | 'newPassword' | 'root';

export interface ChangePasswordError {
  field: ChangePasswordErrorField;
  message: string;
}

/**
 * Maps a failed change-password response to the field that should show it.
 *
 * The 401 branch reads `errorCode` (CHG-PW-02) rather than `message`, because
 * production flattens `message` to "Unauthorized" for both causes. Only an
 * explicit `UNAUTHENTICATED` moves the message off the password field: when the
 * key is absent — an older gateway, or any 401 the backend did not tag — we
 * stay on the far more common wrong-password reading and keep the user in the
 * form. Bouncing a live session to `/login` on a guess is the worse mistake of
 * the two, and it is the exact bug CHG-PW-02 was filed for.
 */
export function changePasswordError(error: unknown): ChangePasswordError {
  const status = statusOf(error);
  if (isAuthFailure(error)) {
    if (errorCodeOf(error) === UNAUTHENTICATED) {
      return { field: 'root', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }
    return { field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng.' };
  }
  if (status === 429) {
    return { field: 'root', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.' };
  }
  if (status === 400) {
    return { field: 'newPassword', message: 'Mật khẩu mới không hợp lệ. Vui lòng chọn mật khẩu khác.' };
  }
  return { field: 'root', message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' };
}
