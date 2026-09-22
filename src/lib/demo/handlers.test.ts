import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { demoHandlers } from './handlers';
import { API_BASE } from '@/test/msw/handlers';
import { DEMO_USER_ID, demoFeaturedSellers, demoPosts, demoProducts } from './fixtures';

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

/**
 * DEMO-RETRY-01. `NotificationBell` and `RightRail` sit in the layout, so these
 * fire on every page; anything missing here falls through to `offlineFallback`
 * and gets retried, which is what put 16 red 503s in the demo console.
 */
describe('demo handlers — the signed-in shell', () => {
  it.each([
    ['notification list', `${API_BASE}/notifications?page=1&limit=10`],
    ['unread badge', `${API_BASE}/notifications/unread-count`],
    ['featured sellers', `${API_BASE}/user/featured-sellers?limit=5`],
    ['following list', `${API_BASE}/social/users/${DEMO_USER_ID}/following?page=1&limit=20`],
  ])('answers the %s without falling through to the 503', async (_label, url) => {
    const res = await fetch(url);

    expect(res.status).toBe(200);
  });

  it('reports zero unread rather than the notification list', async () => {
    const res = await fetch(`${API_BASE}/notifications/unread-count`);
    const body = (await res.json()) as { data: { unreadCount: number } };

    // Pins the match order too: `/notifications` must not swallow this path.
    expect(body.data.unreadCount).toBe(0);
  });

  it('fills the right rail, so the panel does not read as broken', async () => {
    const res = await fetch(`${API_BASE}/user/featured-sellers?limit=5`);
    const body = (await res.json()) as { data: { id: string }[] };

    expect(body.data).toHaveLength(demoFeaturedSellers.length);
    expect(body.data.length).toBeGreaterThan(0);
  });
});

/**
 * The routes themselves, measured on prod with the gateway off: the shell fix
 * alone left `/marketplace`, `/wishlist`, `/orders`, `/returns`, `/addresses`,
 * `/messages`, `/checkout`, `/post/:id` and `/profile/:id` each firing 8–12
 * red 503s. One case per read that was seen falling through.
 */
describe('demo handlers — the routes a visitor can open', () => {
  const [firstPost] = demoPosts;

  it.each([
    ['wishlist', `${API_BASE}/products/wishlist?page=1&limit=12`],
    ['product reviews', `${API_BASE}/products/${demoProducts[0].id}/reviews?page=1&limit=10`],
    ['order history', `${API_BASE}/order/user/${DEMO_USER_ID}?page=1&limit=10`],
    ['order status counts', `${API_BASE}/order/user/${DEMO_USER_ID}/status-counts`],
    ['return requests', `${API_BASE}/order/return-requests/mine?page=1&limit=10`],
    ['address book', `${API_BASE}/user/me/addresses`],
    ['conversation list', `${API_BASE}/chat/conversations`],
    ['province filter', `${API_BASE}/shipping/provinces`],
    ['payment options', `${API_BASE}/payment/options`],
    ['post detail', `${API_BASE}/social/posts/${firstPost.id}`],
    ['post comments', `${API_BASE}/social/posts/${firstPost.id}/comments?page=1&limit=20`],
    ['posts by user', `${API_BASE}/social/posts/user/${firstPost.userId}?page=1&limit=10`],
    ['follower list', `${API_BASE}/social/users/${DEMO_USER_ID}/followers?page=1&limit=20`],
    ['public profile', `${API_BASE}/user/${DEMO_USER_ID}`],
    ['user search', `${API_BASE}/user/search?q=demo&limit=5`],
  ])('answers the %s without falling through to the 503', async (_label, url) => {
    const res = await fetch(url);

    expect(res.status).toBe(200);
  });

  it('keeps /user/:id from swallowing its two-segment siblings', async () => {
    // `/user/me`, `/user/featured-sellers` and `/user/search` are the same shape
    // as `/user/:id`; whichever is registered first wins, so the wildcard has to
    // stay last. A 404 here means one of them moved below it.
    const [me, sellers, search] = await Promise.all([
      fetch(`${API_BASE}/user/me`),
      fetch(`${API_BASE}/user/featured-sellers?limit=5`),
      fetch(`${API_BASE}/user/search?q=demo`),
    ]);

    expect([me.status, sellers.status, search.status]).toEqual([200, 200, 200]);
  });

  it('serves the order status counts, not the order page, on the longer path', async () => {
    const res = await fetch(`${API_BASE}/order/user/${DEMO_USER_ID}/status-counts`);
    const body = (await res.json()) as { data: { all: number } };

    expect(body.data.all).toBe(0);
  });

  it('lists the store\'s posts on its profile and nobody else\'s', async () => {
    const res = await fetch(`${API_BASE}/social/posts/user/${firstPost.userId}?page=1&limit=10`);
    const body = (await res.json()) as { data: { data: { userId: string }[] } };

    expect(body.data.data).toHaveLength(demoPosts.length);
    expect(body.data.data.every((p) => p.userId === firstPost.userId)).toBe(true);
  });

  it('404s a post and a profile that are not in the fixtures', async () => {
    const [post, user] = await Promise.all([
      fetch(`${API_BASE}/social/posts/post_nope000000000`),
      fetch(`${API_BASE}/user/usr_nope000000000000`),
    ]);

    expect([post.status, user.status]).toEqual([404, 404]);
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
