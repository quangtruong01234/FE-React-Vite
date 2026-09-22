import { http, HttpResponse, type RequestHandler } from 'msw';
import { API_BASE } from '@/api/client';
import {
  demoBrands,
  demoCategories,
  demoCurrentUser,
  demoFeaturedSellers,
  demoOrderStatusCounts,
  demoPage,
  demoPaymentOptions,
  demoPosts,
  demoProducts,
  demoPublicUsers,
} from './fixtures';

/**
 * Demo-mode request handlers: the read paths a visitor needs to look around,
 * and nothing else.
 *
 * Two rules hold this together:
 *
 * 1. **Reads are mocked, writes are not.** Login, checkout, cart writes, likes
 *    and every other mutation fall through to `offlineFallback` and answer 503.
 *    Faking a successful checkout would be a lie about what the system does,
 *    and the whole point of the banner is to be straight about the schedule.
 * 2. **`/user/me` is mocked, `/user/login` is not.** Every route in
 *    `router.tsx` sits behind `ProtectedRoute`, so without a session the
 *    visitor bounces to a login form that cannot work. The mocked session is a
 *    plain `user` role — demo mode changes what is visible, never what is
 *    permitted, so `/sell` and `/admin` stay shut.
 *
 * Responses use the `{ data }` envelope because `request()` unwraps it; a bare
 * paginated body would be mistaken for the envelope and collapse to its `data`
 * array.
 */

/** Anything not explicitly mocked. 503 is the truth: the service is away. */
const offlineFallback = http.all(`${API_BASE}/*`, () =>
  HttpResponse.json(
    { message: 'Backend is outside its scheduled window (demo mode).' },
    // No `Retry-After`: `request()` reads that header to schedule an automatic
    // retry, and there is nothing to retry against.
    { status: 503 },
  ),
);

export const demoHandlers: RequestHandler[] = [
  http.get(`${API_BASE}/user/me`, () => HttpResponse.json({ data: demoCurrentUser })),

  http.get(`${API_BASE}/social/posts`, () => HttpResponse.json({ data: demoPage(demoPosts) })),
  // "Following" tab — a fresh demo visitor follows nobody.
  http.get(`${API_BASE}/social/users/:id/feed`, () =>
    HttpResponse.json({ data: demoPage([]) }),
  ),

  http.get(`${API_BASE}/products/with-inventory/all`, () =>
    HttpResponse.json({ data: demoPage(demoProducts) }),
  ),
  http.get(`${API_BASE}/products/:id/with-inventory`, ({ params }) => {
    const product = demoProducts.find((p) => p.id === params.id);
    return product
      ? HttpResponse.json({ data: product })
      : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
  http.post(`${API_BASE}/products/with-inventory/multiple`, async ({ request }) => {
    const body = (await request.json()) as { ids?: string[] } | null;
    const ids = new Set(body?.ids ?? []);
    return HttpResponse.json({ data: demoProducts.filter((p) => ids.has(p.id)) });
  }),

  http.get(`${API_BASE}/products/categories`, () => HttpResponse.json({ data: demoCategories })),
  http.get(`${API_BASE}/products/brands`, () => HttpResponse.json({ data: demoBrands })),

  // An empty cart renders the real empty state; a mocked non-empty cart would
  // lead straight to a checkout that cannot complete.
  http.get(`${API_BASE}/cart`, () => HttpResponse.json({ data: null })),

  // --- The signed-in shell (DEMO-RETRY-01) ---
  //
  // `NotificationBell` and `RightRail` live in the layout, so these four reads
  // fire on every page. Left unmocked they fell through to `offlineFallback`,
  // and each failure was then retried by TanStack Query — 16 red 503s in the
  // console of a page whose whole point is to look finished to a recruiter,
  // plus a billed Worker invocation apiece. Empty is also the honest answer:
  // a demo visitor has no notifications and follows nobody.
  http.get(`${API_BASE}/notifications`, () => HttpResponse.json({ data: demoPage([]) })),
  http.get(`${API_BASE}/notifications/unread-count`, () =>
    HttpResponse.json({ data: { unreadCount: 0 } }),
  ),
  http.get(`${API_BASE}/social/users/:id/following`, () =>
    HttpResponse.json({ data: demoPage([]) }),
  ),
  // Not empty, unlike the rest of the shell: an empty rail reads as a broken
  // panel rather than as a quiet one.
  http.get(`${API_BASE}/user/featured-sellers`, () =>
    HttpResponse.json({ data: demoFeaturedSellers }),
  ),

  // --- The rest of the routes a demo visitor can open (DEMO-RETRY-01) ---
  //
  // Same reasoning as the shell block, one level out: the first pass covered
  // the layout, so `/` went quiet while `/marketplace`, `/wishlist`, `/orders`,
  // `/returns`, `/addresses`, `/messages`, `/checkout`, `/post/:id` and
  // `/profile/:id` each still produced 8–12 red 503s. Empty is the honest
  // answer everywhere here: the demo session has never written anything, so it
  // owns no wishlist, no orders, no returns, no addresses and no chats, and
  // each page renders its real empty state instead of an error state.
  http.get(`${API_BASE}/products/wishlist`, () => HttpResponse.json({ data: demoPage([]) })),
  http.get(`${API_BASE}/products/:id/reviews`, () => HttpResponse.json({ data: demoPage([]) })),
  http.get(`${API_BASE}/order/user/:id/status-counts`, () =>
    HttpResponse.json({ data: demoOrderStatusCounts }),
  ),
  http.get(`${API_BASE}/order/user/:id`, () => HttpResponse.json({ data: demoPage([]) })),
  http.get(`${API_BASE}/order/return-requests/mine`, () =>
    HttpResponse.json({ data: demoPage([]) }),
  ),
  http.get(`${API_BASE}/user/me/addresses`, () => HttpResponse.json({ data: [] })),
  http.get(`${API_BASE}/chat/conversations`, () => HttpResponse.json({ data: [] })),

  // The marketplace's "Tỉnh/Thành" filter. Empty on purpose: the fixture
  // catalogue carries no seller addresses, so a populated dropdown would offer
  // filters that cannot change the result. `SelectFilter` renders "Không tìm
  // thấy" for an empty list — a real empty state, not a broken panel.
  http.get(`${API_BASE}/shipping/provinces`, () => HttpResponse.json({ data: [] })),

  http.get(`${API_BASE}/payment/options`, () =>
    HttpResponse.json({ data: { options: demoPaymentOptions } }),
  ),

  // Post detail and profile. `/social/posts/user/:id` is four segments and
  // `/social/posts/:id` three, so they cannot shadow each other — but keeping
  // the narrower path first documents the intent.
  http.get(`${API_BASE}/social/posts/user/:id`, ({ params }) =>
    HttpResponse.json({ data: demoPage(demoPosts.filter((p) => p.userId === params.id)) }),
  ),
  http.get(`${API_BASE}/social/posts/:id`, ({ params }) => {
    const post = demoPosts.find((p) => p.id === params.id);
    return post
      ? HttpResponse.json({ data: post })
      : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
  http.get(`${API_BASE}/social/posts/:id/comments`, () =>
    HttpResponse.json({ data: demoPage([]) }),
  ),
  http.get(`${API_BASE}/social/users/:id/followers`, () =>
    HttpResponse.json({ data: demoPage([]) }),
  ),

  // `/user/:id` is the one wildcard that can swallow its siblings: `/user/me`,
  // `/user/featured-sellers` and `/user/search` are all two segments too, so it
  // must stay below every one of them. `/user/search` gets an empty list rather
  // than a 404 — the header dropdown is the first thing a visitor pokes at.
  http.get(`${API_BASE}/user/search`, () => HttpResponse.json({ data: [] })),
  http.get(`${API_BASE}/user/:id`, ({ params }) => {
    const user = demoPublicUsers.find((u) => u.id === params.id);
    return user
      ? HttpResponse.json({ data: user })
      : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),

  offlineFallback,
];
