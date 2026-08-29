import type {
  User,
  LoginDto,
  RegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from '@/types';
import { request } from './client';

export const authApi = {
  login: (data: LoginDto): Promise<User> =>
    request<User>('/user/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: RegisterDto): Promise<User> =>
    request<User>('/user/register', { method: 'POST', body: JSON.stringify(data) }),

  // Always 201 with a neutral message, whether or not the email exists.
  forgotPassword: (data: ForgotPasswordDto): Promise<{ message: string }> =>
    request<{ message: string }>('/user/forgot-password', { method: 'POST', body: JSON.stringify(data) }),

  resetPassword: (data: ResetPasswordDto): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/user/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Authenticated password change. 401 = wrong current password (NOT a session
  // expiry) — callers must handle it before the global unauthorized redirect,
  // hence `skipUnauthorizedRedirect`. The gateway leaves the cookie alone on
  // both outcomes, so the caller stays signed in either way.
  changePassword: (data: ChangePasswordDto): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/user/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
      skipUnauthorizedRedirect: true,
    }),

  logout: (): Promise<void> =>
    request('/user/logout', { method: 'POST' }),

  me: (): Promise<User> =>
    request<User>('/user/me', { skipUnauthorizedRedirect: true }),
};
