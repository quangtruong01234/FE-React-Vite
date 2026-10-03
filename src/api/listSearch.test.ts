import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { LIST_SEARCH_MAX, toSearchTerm } from './client';
import { ordersApi } from './orders';
import { usersApi } from './users';
import { productsApi } from './products';
import { socialApi } from './social';

const EMPTY_PAGE = { data: [], total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false };

/** Run `call` against a stub for `path` and return the URL it requested. */
async function captureUrl(path: string, call: () => Promise<unknown>): Promise<URL | undefined> {
  let captured: URL | undefined;
  server.use(
    http.get(`${API_BASE}${path}`, ({ request }) => {
      captured = new URL(request.url);
      return HttpResponse.json({ data: EMPTY_PAGE });
    }),
  );
  await call();
  return captured;
}

describe('toSearchTerm', () => {
  it('trims and caps the term at the backend limit', () => {
    expect(toSearchTerm('  SALE  ')).toBe('SALE');
    expect(toSearchTerm('x'.repeat(LIST_SEARCH_MAX + 5))).toBe('x'.repeat(LIST_SEARCH_MAX));
  });

  it('returns undefined for a missing or blank term so toQuery drops it', () => {
    expect(toSearchTerm()).toBeUndefined();
    expect(toSearchTerm('   ')).toBeUndefined();
  });
});

// LIST-SEARCH-01: every searchable list sends the trimmed term under its
// route's param name, and leaves the param off entirely when there is none.
const CASES: {
  name: string;
  path: string;
  param: 'q' | 'search';
  call: (term?: string) => Promise<unknown>;
}[] = [
  { name: 'admin vouchers', path: '/order/admin/vouchers', param: 'q', call: (t) => ordersApi.getAdminVouchers(1, 20, t) },
  { name: 'seller vouchers', path: '/order/vouchers/mine', param: 'q', call: (t) => ordersApi.getSellerVouchers(1, 20, t) },
  { name: 'seller orders', path: '/order/seller', param: 'q', call: (t) => ordersApi.getSellerOrders(1, 20, undefined, t) },
  { name: 'my return requests', path: '/order/return-requests/mine', param: 'q', call: (t) => ordersApi.getMyReturnRequests(1, 20, t) },
  { name: 'return request queue', path: '/order/return-requests', param: 'q', call: (t) => ordersApi.getReturnRequests(1, 20, undefined, t) },
  { name: 'admin users', path: '/user', param: 'q', call: (t) => usersApi.getPaginated(1, 20, t) },
  { name: 'product risk', path: '/products/admin/risk', param: 'q', call: (t) => productsApi.getAdminRisk({ page: 1, q: t }) },
  { name: 'wishlist', path: '/products/wishlist', param: 'q', call: (t) => productsApi.getWishlist({ page: 1, q: t }) },
  { name: 'reported posts', path: '/social/admin/reports', param: 'q', call: (t) => socialApi.getReportedPosts('pending', 1, 20, t) },
  { name: 'posts by user', path: '/social/posts/user/usr_1', param: 'search', call: (t) => socialApi.getPostsByUser('usr_1', 1, 20, t) },
  { name: 'following feed', path: '/social/users/usr_1/feed', param: 'search', call: (t) => socialApi.getFollowingFeed('usr_1', 1, 20, t) },
];

describe.each(CASES)('$name search', ({ path, param, call }) => {
  it(`sends the trimmed term as \`${param}\``, async () => {
    const url = await captureUrl(path, () => call('  ban phim  '));
    expect(url?.searchParams.get(param)).toBe('ban phim');
  });

  it(`omits \`${param}\` when the term is blank`, async () => {
    expect((await captureUrl(path, () => call('  ')))?.searchParams.has(param)).toBe(false);
    expect((await captureUrl(path, () => call()))?.searchParams.has(param)).toBe(false);
  });
});

it('keeps the seller-order status filter alongside the search term', async () => {
  const url = await captureUrl('/order/seller', () => ordersApi.getSellerOrders(1, 20, 'confirmed', 'ord_1'));
  expect(url?.searchParams.get('status')).toBe('confirmed');
  expect(url?.searchParams.get('q')).toBe('ord_1');
});
