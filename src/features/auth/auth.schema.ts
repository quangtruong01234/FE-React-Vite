import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username là bắt buộc'),
  password: z.string().min(1, 'Password là bắt buộc'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(1, 'Username là bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Tối thiểu 8 ký tự'),
});
export type RegisterFormData = z.infer<typeof registerSchema>;
