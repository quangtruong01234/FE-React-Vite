import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { demoHandlers } from './handlers';
import { API_BASE } from '@/test/msw/handlers';
import { demoProducts } from './fixtures';

/**
 * The suite-wide server (`test/setup.ts`) answers with the shared handlers, so
 * demo mode gets its own server for the duration of this file — this is the
 * only place the demo handler list itself is under test.
 */
const demoServer = setupServer(...demoHandlers);

beforeAll(() => demoServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => demoServer.resetHandlers());
afterAll(() => demoServer.close());

describe('demo handlers — reads', () => {
  it('serves a session so the protected routes open', async () => {
    const res = await fetch(`${API_BASE}/user/me`);
    const body = (await res.json()) as { data: { role: { name: string } } };

    expect(res.status).toBe(200);
    // Plain `user`: demo mode widens what is visible, never what is permitted.
    expect(body.data.role.name).toBe('user');
  });

  it('serves the catalog listing', async () => {
    const res = await fetch(`${API_BASE}/products/with-inventory/all`);
    const body = (await res.json()) as { data: { data: unknown[] } };

    expect(body.data.data).toHaveLength(demoProducts.length);
  });

  it('serves a single product by its opaque id', async () => {
    const [first] = demoProducts;
    const res = await fetch(`${API_BASE}/products/${first.id}/with-inventory`);
    const body = (await res.json()) as { data: { id: string } };

    expect(body.data.id).toBe(first.id);
  });

  it('404s an id that is not in the fixtures, rather than inventing one', async () => {
    const res = await fetch(`${API_BASE}/products/prod_nope00000000000/with-inventory`);

    expect(res.status).toBe(404);
  });
});

describe('demo handlers — writes stay unmocked', () => {
  it('does not fake a login', async () => {
    const res = await fetch(`${API_BASE}/user/login`, { method: 'POST' });

    expect(res.status).toBe(503);
  });

  it('does not fake a checkout', async () => {
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST' });

    expect(res.status).toBe(503);
  });

  it('answers 503 without Retry-After, so request() does not schedule a retry', async () => {
    const res = await fetch(`${API_BASE}/anything/unmocked`);

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBeNull();
  });
});
