import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import type { TurnstileRenderOptions } from './captcha';
import LoginPage from './LoginPage';

// The site key is a module constant read from the env — unset in tests, so the
// other LoginPage tests never see a widget. Here it is set, as on prod.
vi.mock('./captcha', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./captcha')>()),
  TURNSTILE_SITE_KEY: 'site-key',
}));

function installFakeTurnstile(): { solve: (token: string) => void } {
  let last: TurnstileRenderOptions | undefined;
  window.turnstile = {
    render: vi.fn((_el: HTMLElement, opts: TurnstileRenderOptions) => {
      last = opts;
      return 'widget-1';
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  return {
    solve: (token) => {
      if (!last) throw new Error('widget not rendered');
      const options = last;
      act(() => options.callback(token));
    },
  };
}

afterEach(() => {
  delete window.turnstile;
});

const meUnauthenticated = () =>
  http.get(`${API_BASE}/user/me`, () =>
    HttpResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 }),
  );

function renderLogin() {
  return renderWithProviders(
    <ThemeProvider>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </ThemeProvider>,
    { route: '/login' },
  );
}

// F32: the backend enforces CAPTCHA, so a submit without a token is a certain
// 400 CAPTCHA_REQUIRED — the button waits for the widget instead.
describe('LoginPage — captcha gating (site key set)', () => {
  it('keeps forgot-password send disabled until Turnstile issues a token', async () => {
    let forgotBody: unknown;
    server.use(
      meUnauthenticated(),
      http.post(`${API_BASE}/user/forgot-password`, async ({ request }) => {
        forgotBody = await request.json();
        return HttpResponse.json({ data: null }, { status: 201 });
      }),
    );
    const turnstile = installFakeTurnstile();
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    await user.type(await screen.findByLabelText('Email'), 'buyer@example.com');

    const send = screen.getByRole('button', { name: /Gửi mã xác nhận/ });
    expect(send).toBeDisabled();

    await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalled());
    turnstile.solve('tok-1');
    expect(send).toBeEnabled();

    await user.click(send);
    await waitFor(() =>
      expect(forgotBody).toEqual({ email: 'buyer@example.com', captchaToken: 'tok-1' }),
    );
  });

  it('keeps register submit disabled until Turnstile issues a token', async () => {
    server.use(meUnauthenticated());
    const turnstile = installFakeTurnstile();
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Đăng ký ngay' }));
    await screen.findByRole('heading', { name: 'Tạo tài khoản' });

    const submit = screen.getByRole('button', { name: /Đăng ký ngay →/ });
    expect(submit).toBeDisabled();

    await waitFor(() => expect(window.turnstile?.render).toHaveBeenCalled());
    turnstile.solve('tok-1');
    expect(submit).toBeEnabled();
  });
});
