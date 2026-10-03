import { z } from 'zod';
import type { MessageKey } from '@/lib/i18n/messages';
import type { authMessages } from './auth.i18n';

/** zod messages are `authMessages` keys — the form translates them at render (`translateIfKey`). */
const msg = (key: MessageKey<typeof authMessages>): string => key;

export const loginSchema = z.object({
  username: z.string().min(1, msg('usernameRequired')),
  password: z.string().min(1, msg('passwordRequired')),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    // `.trim()` BEFORE `.min(1)` — the other order validates the raw string and
    // then hands back `''`, so `"   "` would pass. Since NAME-TRIM-01 (backend,
    // 2026-09-15) `POST /user/register` trims and 400s on a blank username, so
    // trimming here turns a round-trip into an inline error. It also keeps the
    // auto-login right after register working: the backend stores `"  john  "`
    // as `"john"`, and login is deliberately NOT trimmed server-side, so
    // submitting the padded value would register fine and then fail to log in.
    username: z.string().trim().min(1, msg('usernameRequired')),
    email: z.string().email(msg('emailInvalid')),
    password: z.string().min(8, msg('min8')),
    confirmPassword: z.string().min(1, msg('confirmRequired')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: msg('confirmMismatch'),
    path: ['confirmPassword'],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotEmailSchema = z.object({
  email: z.string().email(msg('emailInvalid')),
});
export type ForgotEmailFormData = z.infer<typeof forgotEmailSchema>;

// Backend contract: code exactly 6 digits, newPassword min 6 chars.
export const resetPasswordSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, msg('codeFormat')),
    newPassword: z.string().min(6, msg('min6')),
    confirmPassword: z.string().min(1, msg('confirmRequired')),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: msg('confirmMismatch'),
    path: ['confirmPassword'],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
