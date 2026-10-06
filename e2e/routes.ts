// Route manifest — every leaf path in src/router.tsx, the role(s) that smoke it,
// and which specs cover its deep flow. Pure data: imported by the smoke specs
// AND by src/router.test.ts, which fails when a route is added to the router
// without a row here. So a new route is smoke-covered the moment it lands.
//
// `deep` lists the spec files that exercise the route's real flow beyond
// "renders cleanly". An empty `deep` is coverage debt ("còn nợ") — `/e2e
// coverage` prints it, `/e2e fill` pays it down.

export type SmokeRole = 'buyer' | 'shop' | 'admin' | 'public';

/** Which run-time fixture fills the `:id` segment. */
export type RouteParam = 'me' | 'post' | 'product' | 'order' | 'ownProduct';

export interface RouteEntry {
  /** Exactly as the router spells it, rooted at `/`. */
  pattern: string;
  roles: SmokeRole[];
  param?: RouteParam;
  deep: string[];
}

export const ROUTES: RouteEntry[] = [
  { pattern: '/login', roles: ['public'], deep: ['auth.setup.ts', 'theme-persist.public.spec.ts', 'lang-persist.public.spec.ts'] },
  { pattern: '/', roles: ['buyer', 'shop', 'admin'], deep: ['feed.buyer.spec.ts'] },
  { pattern: '/messages', roles: ['buyer'], deep: ['messages.buyer.spec.ts'] },

  // Signed-in, any role.
  { pattern: '/post/:id', roles: ['buyer'], param: 'post', deep: ['post-detail.buyer.spec.ts'] },
  { pattern: '/marketplace', roles: ['buyer'], deep: ['auth-session-swap.buyer.spec.ts'] },
  { pattern: '/wishlist', roles: ['buyer'], deep: ['product-detail.buyer.spec.ts'] },
  { pattern: '/product/:id', roles: ['buyer'], param: 'product', deep: ['product-detail.buyer.spec.ts', 'buy-now.buyer.spec.ts'] },
  { pattern: '/cart', roles: ['buyer'], deep: ['cart.buyer.spec.ts', 'reorder.buyer.spec.ts'] },
  {
    pattern: '/checkout',
    roles: ['buyer'],
    deep: ['checkout-resilience.buyer.spec.ts', 'checkout-vouchers.buyer.spec.ts'],
  },
  { pattern: '/orders', roles: ['buyer'], deep: ['order-history.buyer.spec.ts'] },
  { pattern: '/returns', roles: ['buyer'], deep: ['return-request.buyer.spec.ts'] },
  {
    pattern: '/order/:id',
    roles: ['buyer'],
    param: 'order',
    deep: ['order-detail.buyer.spec.ts', 'payment-retry.buyer.spec.ts', 'return-request.buyer.spec.ts', 'reorder.buyer.spec.ts'],
  },
  { pattern: '/payment-result', roles: ['buyer'], deep: ['payment-result.buyer.spec.ts'] },
  { pattern: '/profile/:id', roles: ['buyer'], param: 'me', deep: ['profile.buyer.spec.ts'] },
  { pattern: '/addresses', roles: ['buyer'], deep: ['address-book.buyer.spec.ts'] },
  { pattern: '/notifications', roles: ['buyer'], deep: ['notifications.buyer.spec.ts'] },

  // Seller.
  { pattern: '/shop', roles: ['shop'], deep: ['shop-catalogue.shop.spec.ts'] },
  { pattern: '/sell', roles: ['shop'], deep: ['product-form.shop.spec.ts'] },
  { pattern: '/sell/orders', roles: ['shop'], deep: ['seller-orders.shop.spec.ts'] },
  { pattern: '/sell/returns', roles: ['shop'], deep: ['seller-returns.shop.spec.ts'] },
  { pattern: '/shop/analytics', roles: ['shop'], deep: ['shop-catalogue.shop.spec.ts'] },
  { pattern: '/sell/vouchers', roles: ['shop'], deep: ['seller-vouchers.shop.spec.ts'] },
  { pattern: '/sell/:id', roles: ['shop'], param: 'ownProduct', deep: ['shop-catalogue.shop.spec.ts'] },

  // Admin.
  { pattern: '/admin', roles: ['admin'], deep: ['admin-dashboard.admin.spec.ts'] },
  { pattern: '/admin/brands/pending', roles: ['admin'], deep: ['catalog-review.admin.spec.ts'] },
  { pattern: '/admin/categories/pending', roles: ['admin'], deep: ['catalog-review.admin.spec.ts'] },
  { pattern: '/admin/reports', roles: ['admin'], deep: ['post-moderation.admin.spec.ts'] },
  { pattern: '/admin/product-risk', roles: ['admin'], deep: ['product-risk.admin.spec.ts'] },
  { pattern: '/admin/vouchers', roles: ['admin'], deep: ['admin-vouchers.admin.spec.ts'] },
  { pattern: '/admin/analytics', roles: ['admin'], deep: ['admin-dashboard.admin.spec.ts'] },
];

/** Where a signed-in role must NOT get in — ProtectedRoute sends it to `/`. */
export const FORBIDDEN: Record<Exclude<SmokeRole, 'public'>, string[]> = {
  buyer: ['/shop', '/sell', '/admin'],
  shop: ['/admin'],
  admin: ['/sell'],
};

/** Signed out, a guarded route must bounce to `/login`. */
export const SIGNED_OUT_GUARDED = ['/sell', '/admin'];
