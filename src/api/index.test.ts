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

// `request()` rebuilds the thrown error from the response body rather than
// passing the body through, so any field it does not copy is invisible to every
// caller. `errorCode` (CHG-PW-02, MAIL-UI-01) is the backend's only
// production-safe discriminator between two otherwise byte-identical failures,
// which makes this forwarding the load-bearing part of both features.
describe('request() — errorCode forwarding', () => {
  it('forwards errorCode from the error body onto the thrown ApiError', async () => {
    server.use(
      http.get(`${API_BASE}/user/usr_0000000000000011`, () =>
        HttpResponse.json(
          { statusCode: 401, error: 'Unauthorized', errorCode: 'INVALID_CURRENT_PASSWORD', message: 'Unauthorized' },
          { status: 401 },
        ),
      ),
    );

    await expect(api.users.getById('usr_0000000000000011')).rejects.toMatchObject({
      statusCode: 401,
      errorCode: 'INVALID_CURRENT_PASSWORD',
    });
  });

  it('leaves errorCode undefined when the body has none — the key must be absent, not null', async () => {
    server.use(
      http.get(`${API_BASE}/user/usr_0000000000000012`, () =>
        HttpResponse.json({ message: 'Bad Request' }, { status: 400 }),
      ),
    );

    const error = await api.users.getById('usr_0000000000000012').catch((e: unknown) => e);
    expect(error).toMatchObject({ statusCode: 400 });
    expect((error as { errorCode?: string }).errorCode).toBeUndefined();
    expect('errorCode' in (error as object)).toBe(false);
  });

  it('ignores a non-string errorCode rather than passing a junk value to callers', async () => {
    server.use(
      http.get(`${API_BASE}/user/usr_0000000000000013`, () =>
        HttpResponse.json({ message: 'Bad Request', errorCode: 42 }, { status: 400 }),
      ),
    );

    const error = await api.users.getById('usr_0000000000000013').catch((e: unknown) => e);
    expect((error as { errorCode?: unknown }).errorCode).toBeUndefined();
  });

  // Verbatim production body (captured 2026-09-11 against the deployed gateway).
  // Note `"status":"error"` — a string sibling of the numeric `statusCode`.
  // `request()` builds `status` from `res.status`, so the string cannot leak;
  // this pins that, because spreading the body instead would hand every
  // `statusOf()` caller the string 'error' and silently break their comparisons.
  it('keeps status numeric even though the real body sends status:"error"', async () => {
    server.use(
      http.get(`${API_BASE}/user/usr_0000000000000014`, () =>
        HttpResponse.json(
          {
            statusCode: 401,
            status: 'error',
            error: 'Unauthorized',
            errorCode: 'INVALID_CURRENT_PASSWORD',
            message: 'Unauthorized',
            data: null,
            path: '/api/user/change-password',
            method: 'POST',
          },
          { status: 401 },
        ),
      ),
    );

    const error = await api.users.getById('usr_0000000000000014').catch((e: unknown) => e);
    expect(error).toMatchObject({
      statusCode: 401,
      status: 401,
      errorCode: 'INVALID_CURRENT_PASSWORD',
    });
  });
});

// BATCH-STATUS-01: `fetchBatchTolerant` and both of its triggers were deleted
// once the gateway stopped losing a batch quietly. These pin the two behaviours
// that replaced it — a truthful `[]` costs one request, and a failure is an
// error rather than an empty cart.
describe('products.getMultipleWithInventory — no tolerant fan-out', () => {
  it('trusts an empty batch instead of re-checking each id', async () => {
    const batchCalls = vi.fn();
    const perIdCalls = vi.fn();
    server.use(
      http.post(`${API_BASE}/products/with-inventory/multiple`, () => {
        batchCalls();
        return HttpResponse.json([]);
      }),
      http.get(`${API_BASE}/products/:id/with-inventory`, () => {
        perIdCalls();
        return HttpResponse.json({ id: 'prod_1' });
      }),
    );

    await expect(api.products.getMultipleWithInventory(['prod_1', 'prod_2'])).resolves.toEqual([]);
    expect(batchCalls).toHaveBeenCalledTimes(1);
    // The old trigger 2 fired here and spent one request per id re-confirming.
    expect(perIdCalls).not.toHaveBeenCalled();
  });

  it('propagates a failure rather than swallowing it into an empty list', async () => {
    server.use(
      http.post(`${API_BASE}/products/with-inventory/multiple`, () =>
        HttpResponse.json(
          { statusCode: 502, error: 'Bad Gateway', message: 'Service unavailable' },
          { status: 502 },
        ),
      ),
    );

    await expect(api.products.getMultipleWithInventory(['prod_1'])).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('sends no request at all for an empty id list', async () => {
    const batchCalls = vi.fn();
    server.use(
      http.post(`${API_BASE}/products/with-inventory/multiple`, () => {
        batchCalls();
        return HttpResponse.json([]);
      }),
    );

    await expect(api.products.getMultipleWithInventory([])).resolves.toEqual([]);
    expect(batchCalls).not.toHaveBeenCalled();
  });
});
