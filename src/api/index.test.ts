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
      http.get(`${API_BASE}/user/usr_0000000000000001`, () =>
        HttpResponse.json({ message: 'Hết phiên' }, { status: 401 }),
      ),
    );

    await expect(api.users.getById('usr_0000000000000001')).rejects.toMatchObject({ statusCode: 401 });
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
      http.get(`${API_BASE}/user/usr_0000000000000007`, () => HttpResponse.json({ data: { id: 'usr_0000000000000007' } })),
    );

    await expect(api.users.getById('usr_0000000000000007')).resolves.toMatchObject({ id: 'usr_0000000000000007' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

// Integration test for the 503 overload-retry wiring inside `request()`.
// `retry.test.ts` covers the pure delay-decision helper; this asserts the shed
// response is actually retried once through a real fetch + MSW round-trip.
// Retry-After: 0 keeps the delay at 0ms so the test doesn't wait.
describe('request() — 503 overload retry (SCALE-05)', () => {
  it('retries once on a 503 and resolves with the retry response', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE}/user/usr_0000000000000009`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { message: 'Server is under heavy load, please retry shortly' },
            { status: 503, headers: { 'Retry-After': '0' } },
          );
        }
        return HttpResponse.json({ data: { id: 'usr_0000000000000009' } });
      }),
    );

    await expect(api.users.getById('usr_0000000000000009')).resolves.toMatchObject({ id: 'usr_0000000000000009' });
    expect(calls).toBe(2);
  });

  it('surfaces the error when the single retry also sheds (503)', async () => {
    let calls = 0;
    server.use(
      http.get(`${API_BASE}/user/usr_0000000000000010`, () => {
        calls += 1;
        return HttpResponse.json(
          { message: 'Server is under heavy load, please retry shortly' },
          { status: 503, headers: { 'Retry-After': '0' } },
        );
      }),
    );

    await expect(api.users.getById('usr_0000000000000010')).rejects.toMatchObject({ statusCode: 503 });
    expect(calls).toBe(2);
  });
});
