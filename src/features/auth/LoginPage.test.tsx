import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { AuthProvider } from '@/context/AuthContext';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import LoginPage from './LoginPage';

// AuthProvider probes the session on mount; an unauthenticated 401 keeps us on
// the auth screen (the probe opts out of the redirect).
const meUnauthenticated = () =>
  http.get(`${API_BASE}/user/me`, () =>
    HttpResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 }),
  );

function renderLogin() {
  return renderWithProviders(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
    { route: '/login' },
  );
}

// The login screen renders a "Đăng ký ngay" link that swaps in the register form.
async function openRegister(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Đăng ký ngay' }));
  await screen.findByRole('heading', { name: 'Tạo tài khoản' });
}

async function fillRegister(
  user: UserEvent,
  fields: { username: string; email: string; password: string },
): Promise<void> {
  await user.type(screen.getByLabelText('Tên đăng nhập'), fields.username);
  await user.type(screen.getByLabelText('Email'), fields.email);
  await user.type(screen.getByLabelText('Mật khẩu'), fields.password);
}

describe('LoginPage — register flow', () => {
  it('blocks submit and shows field errors for invalid email / short password', async () => {
    server.use(meUnauthenticated());
    const user = userEvent.setup();
    renderLogin();
    await openRegister(user);

    await fillRegister(user, { username: 'newbie', email: 'not-an-email', password: 'short' });
    await user.click(screen.getByRole('button', { name: /Đăng ký ngay/ }));

    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Tối thiểu 8 ký tự')).toBeInTheDocument();
  });

  it('surfaces the server message when registration is rejected', async () => {
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/register`, () =>
        HttpResponse.json({ message: 'Tên đăng nhập đã tồn tại' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await openRegister(user);

    await fillRegister(user, { username: 'taken', email: 'a@b.com', password: 'password123' });
    await user.click(screen.getByRole('button', { name: /Đăng ký ngay/ }));

    expect(await screen.findByText('Tên đăng nhập đã tồn tại')).toBeInTheDocument();
  });

  it('posts the typed credentials to register, then logs in', async () => {
    let registerBody: unknown;
    const account = { id: 42, username: 'newbie' };
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/register`, async ({ request }) => {
        registerBody = await request.json();
        return HttpResponse.json({ data: account });
      }),
      http.post(`${API_BASE}/user/login`, () => HttpResponse.json({ data: account })),
    );
    const user = userEvent.setup();
    renderLogin();
    await openRegister(user);

    await fillRegister(user, { username: 'newbie', email: 'new@b.com', password: 'password123' });
    await user.click(screen.getByRole('button', { name: /Đăng ký ngay/ }));

    await waitFor(() =>
      expect(registerBody).toEqual({
        username: 'newbie',
        email: 'new@b.com',
        password: 'password123',
      }),
    );
  });
});
