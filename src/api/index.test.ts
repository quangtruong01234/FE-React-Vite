import { describe, it, expect, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { api, registerUnauthorizedHandler } from '@/api';

// Integration test for the 401 → login-redirect wiring inside `request()`.
// `unauthorized.test.ts` covers the pure decision helper; this asserts the
// helper is actually invoked through a real fetch + MSW round-trip, including
// the `skipUnauthorizedRedirect` opt-out used by the session probe.
describe('request() — 401 redirect wiring', () => {
  afterEach(() => {
    // Reset the module-level handler so a spy can't leak into another test.
    registerUnauthorizedHandler(() => {});
  });

  it('invokes the unauthorized handler with a login redirect on 401', async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);
    server.use(
      http.get(`${API_BASE}/user/1`, () =>
        HttpResponse.json({ message: 'Hết phiên' }, { status: 401 }),
      ),
    );

    await expect(api.users.getById(1)).rejects.toMatchObject({ statusCode: 401 });
    // jsdom's default pathname is '/', so next encodes to %2F.
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith('/login?next=%2F');
  });

  it('does not redirect when the call opts out (auth.me session probe)', async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);
    server.use(
      http.get(`${API_BASE}/user/me`, () =>
        HttpResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 }),
      ),
    );

    await expect(api.auth.me()).rejects.toMatchObject({ statusCode: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not redirect on a successful response', async () => {
    const onUnauthorized = vi.fn();
    registerUnauthorizedHandler(onUnauthorized);
    server.use(
      http.get(`${API_BASE}/user/7`, () => HttpResponse.json({ data: { id: 7 } })),
    );

    await expect(api.users.getById(7)).resolves.toMatchObject({ id: 7 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
