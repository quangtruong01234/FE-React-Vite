import { z } from 'zod';

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
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;
