import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username là bắt buộc'),
  password: z.string().min(1, 'Password là bắt buộc'),
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
    username: z.string().trim().min(1, 'Username là bắt buộc'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(8, 'Tối thiểu 8 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotEmailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
export type ForgotEmailFormData = z.infer<typeof forgotEmailSchema>;

// Backend contract: code exactly 6 digits, newPassword min 6 chars.
export const resetPasswordSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'Mã xác nhận gồm đúng 6 chữ số'),
    newPassword: z.string().min(6, 'Tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
