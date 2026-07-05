import type { User, LoginDto, RegisterDto } from '@/types';
import { request } from './client';

export const authApi = {
  login: (data: LoginDto): Promise<User> =>
    request<User>('/user/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: RegisterDto): Promise<User> =>
    request<User>('/user/register', { method: 'POST', body: JSON.stringify(data) }),

  logout: (): Promise<void> =>
    request('/user/logout', { method: 'POST' }),

  me: (): Promise<User> =>
    request<User>('/user/me', { skipUnauthorizedRedirect: true }),
};
