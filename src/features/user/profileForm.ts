import { z } from 'zod';
import type { ApiError, UpdateUserDto } from '@/types';
import { credentialConflictError } from '@/lib/domain/credentialConflict';
import { currentPasswordAuthError } from './changePassword';

/**
 * Validation for "Chỉnh sửa hồ sơ" — the only screen in the app that writes
 * `name`.
 *
 * `.trim()` before `.min(1)` is the fix, not a tidy-up: `min(1)` alone accepts
 * `"   "`, `PATCH /user/:id` stores it verbatim, and from then on every label
 * for that account (`userDisplayName`) has nothing visible to render. Trimming
 * here also normalises what we send, so `" Quang "` is saved as `"Quang"`.
 */
export const profileFormSchema = z.object({
  name: z.string().trim().min(1, 'Tên không được trống'),
  email: z.string().email('Email không hợp lệ'),
  avatar: z.string().optional(),
  currentPassword: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

/**
 * EMAIL-REAUTH-01 (2026-09-26): `PATCH /user/:id` needs `currentPassword`
 * whenever `email` differs from the stored one. The backend compares the exact
 * string, so a case-only edit counts as a change here too — trimming or
 * lowercasing on this side would hide the field for a change the server still
 * treats as one, and the save would come back 400.
 */
export function isEmailChanged(storedEmail: string, typedEmail: string): boolean {
  return typedEmail !== storedEmail;
}

/** `profileFormSchema` plus "the password is required once the email changes". */
export function profileFormSchemaFor(storedEmail: string): typeof profileFormSchema {
  return profileFormSchema.refine(
    (data) => !isEmailChanged(storedEmail, data.email) || Boolean(data.currentPassword),
    { message: 'Nhập mật khẩu hiện tại để đổi email', path: ['currentPassword'] },
  );
}

/**
 * The body for `PATCH /user/:id`. `currentPassword` goes out ONLY with a
 * changed email: a gateway without EMAIL-REAUTH-01 rejects the unknown key
 * (`forbidNonWhitelisted`), and a name/avatar save has no reason to carry a
 * password at all — the modal re-sends the unchanged email on every save.
 */
export function profileUpdatePayload(data: ProfileFormData, storedEmail: string): UpdateUserDto {
  const payload: UpdateUserDto = { name: data.name, email: data.email, avatar: data.avatar };
  if (isEmailChanged(storedEmail, data.email) && data.currentPassword) {
    payload.currentPassword = data.currentPassword;
  }
  return payload;
}

export type ProfileUpdateErrorField = 'email' | 'currentPassword' | 'root';

export interface ProfileUpdateError {
  field: ProfileUpdateErrorField;
  message: string;
}

/**
 * Maps a failed profile save to the field that should show it.
 * - 401 → `errorCode` decides: `INVALID_CURRENT_PASSWORD` stays on the password
 *   field (the cookie is still valid), `UNAUTHENTICATED` is a dead session.
 * - 400 naming `currentPassword` → the password field. The schema blocks the
 *   missing-password case first, so this is the backstop.
 * - 429 → the route is rate-limited to 10 edits / 60s per user.
 * - Anything else → the existing 409 email-taken mapping.
 */
export function profileUpdateError(error: unknown): ProfileUpdateError {
  const authError = currentPasswordAuthError(error);
  if (authError) return authError;

  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 429) {
    return { field: 'root', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.' };
  }
  if (status === 400 && typeof err?.message === 'string' && /currentPassword/i.test(err.message)) {
    return { field: 'currentPassword', message: 'Nhập mật khẩu hiện tại để đổi email' };
  }

  const { field, message } = credentialConflictError(error, 'Cập nhật thất bại');
  return { field: field === 'email' ? 'email' : 'root', message };
}
