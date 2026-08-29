import { z } from 'zod';
import type { ApiError, ChangePasswordDto } from '@/types';

/**
 * Schema + pure helpers for the signed-in change-password form.
 *
 * Backend contract (CHG-PW-01), confirmed against the gateway:
 * - `POST /user/change-password` `{ currentPassword, newPassword }`, JWT cookie
 *   identifies the account → `201 { success: true }`. The cookie is left alone
 *   on every outcome, so the session survives both success and failure.
 * - `401` → the supplied current password is wrong. This is the one 401 in the
 *   app that is NOT a dead session, so the call sets `skipUnauthorizedRedirect`
 *   and this module maps it to a field-level message instead.
 * - `400` → DTO validation (new password shorter than 6 chars, equal to the
 *   current one, or an unwhitelisted field in the body). Client-side zod
 *   prevents the first two, so a 400 means the server rejected something the
 *   form did not catch.
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

function messageOf(error: unknown): string {
  const err = error as ApiError | undefined;
  return typeof err?.message === 'string' ? err.message : '';
}

/**
 * Two different 401s reach this call and the body's `message` is the only thing
 * that tells them apart: "Current password is incorrect" (the guard passed, the
 * password was wrong) vs the JwtAuthGuard's own "Access token is required" /
 * "Unauthorized" (the session really is dead).
 *
 * Matched the narrow way round on purpose: only the guard's own wording counts
 * as an expired session, so if the backend ever reworks the wrong-password
 * message the common case still lands on the right field.
 */
function isExpiredSession(error: unknown): boolean {
  const message = messageOf(error).toLowerCase();
  return message.includes('access token') || message === 'unauthorized';
}

/** Which form field a failed change-password response belongs to. */
export type ChangePasswordErrorField = 'currentPassword' | 'newPassword' | 'root';

export interface ChangePasswordError {
  field: ChangePasswordErrorField;
  message: string;
}

/**
 * Maps a failed change-password response to the field that should show it.
 * A 401 is normally the wrong-current-password case and belongs on that input
 * (see `isExpiredSession` for the one 401 that does not); anything else is a
 * form-level message.
 */
export function changePasswordError(error: unknown): ChangePasswordError {
  const status = statusOf(error);
  if (status === 401 || status === 403) {
    if (isExpiredSession(error)) {
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
  // 404 until the endpoint ships — surfaced plainly rather than as a network error.
  if (status === 404) {
    return { field: 'root', message: 'Tính năng đổi mật khẩu chưa sẵn sàng. Vui lòng thử lại sau.' };
  }
  return { field: 'root', message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.' };
}
