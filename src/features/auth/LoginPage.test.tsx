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
  fields: { username: string; email: string; password: string; confirmPassword?: string },
): Promise<void> {
  await user.type(screen.getByLabelText('Tên đăng nhập'), fields.username);
  await user.type(screen.getByLabelText('Email'), fields.email);
  await user.type(screen.getByLabelText('Mật khẩu'), fields.password);
  await user.type(screen.getByLabelText('Nhập lại mật khẩu'), fields.confirmPassword ?? fields.password);
}

describe('LoginPage — login flow', () => {
  async function submitLogin(user: UserEvent, opts: { rememberMe: boolean }): Promise<unknown> {
    let loginBody: unknown;
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/login`, async ({ request }) => {
        loginBody = await request.json();
        return HttpResponse.json({ data: { id: 17, username: 'buyer' } });
      }),
    );
    renderLogin();

    await user.type(screen.getByLabelText('Tài khoản'), 'buyer');
    await user.type(screen.getByLabelText('Mật khẩu'), 'password123');
    if (opts.rememberMe) {
      await user.click(screen.getByRole('checkbox', { name: 'Ghi nhớ đăng nhập' }));
    }
    await user.click(screen.getByRole('button', { name: /Đăng nhập/ }));

    await waitFor(() => expect(loginBody).toBeDefined());
    return loginBody;
  }

  it('sends rememberMe: true (real boolean) when the checkbox is ticked', async () => {
    const user = userEvent.setup();
    const body = await submitLogin(user, { rememberMe: true });

    expect(body).toEqual({ username: 'buyer', password: 'password123', rememberMe: true });
  });

  it('omits rememberMe entirely when the checkbox is left unticked', async () => {
    const user = userEvent.setup();
    const body = await submitLogin(user, { rememberMe: false });

    expect(body).toEqual({ username: 'buyer', password: 'password123' });
  });
});

describe('LoginPage — forgot-password flow', () => {
  async function openForgot(user: UserEvent): Promise<void> {
    await user.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    await screen.findByRole('heading', { name: 'Quên mật khẩu' });
  }

  it('blocks the send step on an invalid email', async () => {
    server.use(meUnauthenticated());
    const user = userEvent.setup();
    renderLogin();
    await openForgot(user);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /Gửi mã xác nhận/ }));

    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
  });

  it('posts the email, advances to the code step, and starts the resend cooldown', async () => {
    let forgotBody: unknown;
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/forgot-password`, async ({ request }) => {
        forgotBody = await request.json();
        return HttpResponse.json(
          { message: 'If the email exists, a verification code has been sent' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await openForgot(user);

    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.click(screen.getByRole('button', { name: /Gửi mã xác nhận/ }));

    // Step 2: neutral anti-enumeration copy + code form
    expect(await screen.findByLabelText('Mã xác nhận')).toBeInTheDocument();
    expect(forgotBody).toEqual({ email: 'buyer@example.com' });
    expect(screen.getByText(/Nếu email tồn tại/)).toBeInTheDocument();

    // Resend is on a 60s cooldown right after the send
    const resend = screen.getByRole('button', { name: /Gửi lại mã \(\d+s\)/ });
    expect(resend).toBeDisabled();
  });

  it('resets the password and returns to login with a success notice', async () => {
    let resetBody: unknown;
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/forgot-password`, () =>
        HttpResponse.json({ message: 'ok' }, { status: 201 }),
      ),
      http.post(`${API_BASE}/user/reset-password`, async ({ request }) => {
        resetBody = await request.json();
        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderLogin();
    await openForgot(user);

    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.click(screen.getByRole('button', { name: /Gửi mã xác nhận/ }));

    await user.type(await screen.findByLabelText('Mã xác nhận'), '123456');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'newpass1');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'newpass1');
    await user.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/ }));

    // Back on the login form with the success banner; NOT logged in
    expect(await screen.findByText(/Đặt lại mật khẩu thành công/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeInTheDocument();
    expect(resetBody).toEqual({ email: 'buyer@example.com', code: '123456', newPassword: 'newpass1' });
  });

  it('shows the invalid/expired-code message on a reset 400', async () => {
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/forgot-password`, () =>
        HttpResponse.json({ message: 'ok' }, { status: 201 }),
      ),
      http.post(`${API_BASE}/user/reset-password`, () =>
        HttpResponse.json({ message: 'Invalid or expired verification code' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();
    await openForgot(user);

    await user.type(screen.getByLabelText('Email'), 'buyer@example.com');
    await user.click(screen.getByRole('button', { name: /Gửi mã xác nhận/ }));

    await user.type(await screen.findByLabelText('Mã xác nhận'), '000000');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'newpass1');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'newpass1');
    await user.click(screen.getByRole('button', { name: /Đặt lại mật khẩu/ }));

    expect(await screen.findByText(/Mã xác nhận không đúng hoặc đã hết hạn/)).toBeInTheDocument();
    // Still on the code step so the user can retry / resend
    expect(screen.getByLabelText('Mã xác nhận')).toBeInTheDocument();
  });
});

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

  it('toggles password visibility per field independently', async () => {
    server.use(meUnauthenticated());
    const user = userEvent.setup();
    renderLogin();
    await openRegister(user);

    const password = screen.getByLabelText('Mật khẩu');
    const confirm = screen.getByLabelText('Nhập lại mật khẩu');
    expect(password).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');

    // Two show-toggles render (one per field) — click only the first
    const [showPassword] = screen.getAllByRole('button', { name: 'Hiện mật khẩu' });
    await user.click(showPassword);

    expect(password).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('blocks submit when the password confirmation does not match', async () => {
    server.use(meUnauthenticated());
    const user = userEvent.setup();
    renderLogin();
    await openRegister(user);

    await fillRegister(user, {
      username: 'newbie',
      email: 'a@b.com',
      password: 'password123',
      confirmPassword: 'different123',
    });
    await user.click(screen.getByRole('button', { name: /Đăng ký ngay/ }));

    expect(await screen.findByText('Mật khẩu nhập lại không khớp')).toBeInTheDocument();
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
