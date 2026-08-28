# Structure & Routing

## File Naming

- Components: PascalCase — `MarketplacePage.tsx`, `CartDrawer.tsx`
- Hooks: camelCase + `use` prefix — `useAuth.ts`, `useLogin.ts`, `useProduct.ts`
- No `services/` folder — HTTP calls live in `src/api/<domain>.ts` (auth, products, orders, cart, chat, social, …), aggregated into the `api` object by `api/index.ts`
- Types: split by feature/domain under `types/` (e.g. `product.ts`, `order.ts`, `cart.ts`); `types/index.ts` is the barrel — always import from `@/types`

## Folder Structure

> Tests are **colocated** — `foo.ts` sits next to `foo.test.ts`. They are omitted from this tree.

```
frontend/
├── e2e/                        # Playwright specs + auth.setup.ts, accounts.ts, orderApi.ts
└── src/
    ├── main.tsx
    ├── App.tsx                 # QueryClientProvider + AuthProvider + RouterProvider (no CartProvider)
    ├── router.tsx              # createBrowserRouter + React.lazy pages
    ├── routerLayouts.tsx       # AppShell-based layouts (FeedLayout, MessagesLayout, …)
    ├── lib/                    # Layered by concern — put new utils in the matching layer
    │   ├── format/             # utils.ts (cn, formatPrice), time.ts, pagination.ts
    │   ├── query/              # queryClient.ts, orderInvalidation.ts
    │   ├── realtime/           # socket.ts (SOCKET_CONNECT_OPTIONS), chatSound.ts
    │   ├── auth/               # authChannel.ts, roleAccess.ts
    │   ├── domain/             # orderStatus.ts, paymentUrl.ts, sku.ts, sharePost.ts, likedPosts.ts
    │   └── http/               # cloudinary.ts, fetchBatchTolerant.ts, signedUploadFields.ts,
    │                           # uploadValidation.ts, uploadChunkPlan.ts, uploadSequential.ts,
    │                           # uploadOwner.ts, deleteMediaOutcome.ts
    ├── api/
    │   ├── client.ts           # request() wrapper
    │   ├── index.ts            # aggregates domain modules into the `api` object
    │   └── auth.ts · products.ts · orders.ts · cart.ts · payment.ts · inventory.ts
    │       · shipping.ts · chat.ts · social.ts · notifications.ts · reviews.ts
    │       · users.ts · upload.ts · retry.ts · unauthorized.ts · misc.ts
    ├── types/                  # Split by feature/domain; index.ts re-exports (barrel)
    │   ├── index.ts            # Barrel — import from '@/types'
    │   ├── common.ts           # PaginatedResponse, ApiError, HealthStatus
    │   ├── auth.ts · user.ts · address.ts · catalog.ts · inventory.ts
    │   ├── product.ts · cart.ts · payment.ts · order.ts
    │   └── social.ts · notification.ts · chat.ts · upload.ts
    ├── hooks/                  # Layered by concern
    │   ├── query/              # queryKeys.ts (key factory), cartCache.ts
    │   ├── auth/               # useAuth.ts, useRole.ts
    │   ├── data/               # useCart.ts, useProductReviews.ts, useProductsByIds.ts, useWishlist.ts
    │   └── ui/                 # useDebouncedValue.ts, useFilterParam.ts, usePageParam.ts, useResetOnChange.ts
    ├── context/
    │   └── AuthContext.tsx     # AuthProvider + useAuthContext() — the ONLY context in the app
    ├── components/
    │   ├── ui/                 # shadcn/ui (DO NOT EDIT — write-blocked; install only via `npx shadcn add`)
    │   ├── layout/             # AppShell, Header, LeftRail, RightRail, MobileNav,
    │   │                       # NotificationBell, ProfileMenu, navItems.ts
    │   ├── auth/               # ProtectedRoute.tsx (route guard, optional requiredRole)
    │   └── shared/             # Non-shadcn reusables: ApiErrorState, Avatar, FetchingOverlay,
    │                           # GradientButton, IconButton, LiveBadge, ModalCloseButton, OnlinePill,
    │                           # PageSkeleton, Pagination, PriceText, ProductThumb, RichTextEditor,
    │                           # StarRating, StatusBadge, TextField, ToggleSwitch, WishlistButton,
    │                           # richTextImages.ts
    ├── test/                   # Vitest infra: setup.ts, renderWithProviders.tsx, msw/
    ├── features/
    │   ├── address/            # AddressesPage, AddressFormModal, AddressSelect, AddressBookPicker,
    │   │                       # useAddresses, useShippingLocations, addressUtils
    │   ├── admin/              # AdminPage, AdminAnalyticsPage, Pending{Brands,Categories}Page,
    │   │                       # ReportedPostsPage, ProductRiskPage, postModeration, productRisk,
    │   │                       # AdminVouchersPage (thin — binds features/voucher/)
    │   ├── auth/               # LoginPage, ForgotPasswordForm, PasswordField, auth.schema, useLogin
    │   ├── cart/               # CartPage, CheckoutPage + checkout/voucher/shippingFee helpers
    │   ├── chat/               # ChatDialog, ChatThread, MessagesPage, useChat, chatPresenceSocket, chat*.ts
    │   ├── notifications/      # NotificationsPage, notificationSocket, notificationCache, notificationDisplay
    │   ├── order/              # OrderHistory/OrderDetail/SellerOrders/ReturnRequests/ShopAnalytics pages
    │   │                       # + analytics/ + order helper modules + use*.ts hooks
    │   ├── payment/            # PaymentResultPage, paymentResultParams
    │   ├── product/            # MarketplacePage, ProductDetail, ProductCard, CreateProductPage,
    │   │                       # product-form/, useProducts, productParams, marketplaceUrl
    │   ├── shop/               # ShopPage, lowStock, SellerVouchersPage (thin — binds features/voucher/)
    │   ├── social/             # FeedPage, PostCard, PostDetailPage, CreatePostModal, ProductPicker,
    │   │                       # ReportPostDialog, useFeed/useComments/useFollow/useSharePost
    │   ├── user/               # ProfilePage, EditProfileModal, FollowListModal, avatarUpload, profileAbout
    │   ├── voucher/            # Role-neutral voucher console shared by admin + shop:
    │   │                       # VoucherConsole, voucherConsoleBinding (endpoints/keys/copy per role),
    │   │                       # voucherRules(.schema)
    │   └── wishlist/           # WishlistPage, wishlistCache
    └── assets/
```

## Where to put new code

- New route-level page → `features/<feature>/<Name>Page.tsx`
- New hook for a feature → same feature folder, co-located
- New shared/reusable component → `components/shared/`
- New cross-cutting hook (used by 2+ features) → `hooks/<layer>/` (`query`/`auth`/`data`/`ui`)
- New cross-cutting util → `lib/<layer>/` (`format`/`query`/`realtime`/`auth`/`domain`/`http`)
- New type → `types/<domain>.ts` (re-export via `types/index.ts` barrel)
- New API call → `api/<domain>.ts` (+ query key in `hooks/query/queryKeys.ts`)

> Before creating anything: run `/audit-duplicates <name>` first.

## Routing — React Router DOM v7

Source of truth: `src/router.tsx` (route-level pages lazy-load via `React.lazy` + `<Suspense fallback={<PageSkeleton />}>`). Guards: `ProtectedRoute` (optionally with `requiredRole="shop" | "admin"`).

| Path | Component | Guard |
|---|---|---|
| `/login` | `LoginPage` | public |
| `/` | `FeedLayout` (social feed) | auth |
| `/messages` | `MessagesLayout` | auth |
| `/post/:id` | `PostDetailPage` | auth |
| `/marketplace` · `/wishlist` | `MarketplacePage` · `WishlistPage` | auth |
| `/product/:id` | `ProductDetail` | auth |
| `/cart` · `/checkout` | `CartPage` · `CheckoutPage` | auth |
| `/orders` · `/order/:id` · `/returns` | order pages | auth |
| `/payment-result` | `PaymentResultPage` | auth |
| `/profile/:id` · `/addresses` | `ProfilePage` · `AddressesPage` | auth |
| `/notifications` | `NotificationsPage` | auth |
| `/shop` · `/shop/analytics` | `ShopPage` · `ShopAnalyticsPage` | role: shop |
| `/sell` · `/sell/:id` · `/sell/orders` · `/sell/returns` · `/sell/vouchers` | seller pages | role: shop |
| `/admin` · `/admin/analytics` · `/admin/reports` · `/admin/product-risk` · `/admin/vouchers` · `/admin/{brands,categories}/pending` | admin pages | role: admin |
| `*` (inside layout) | 404 `ApiErrorState` | — |
| `*` (top-level) | `<Navigate to="/" />` | — |

> Don't duplicate the router code here — when adding a route, edit `src/router.tsx` and add a row to this table.

Rules:
- Navigate via `<Link>` / `useNavigate` — never `window.location.href`
- No view-state flags replacing `<Route>` (e.g. `if (page === 'cart')`)
- Converted public-ID route params (`usr_`, `prod_`, `ord_`, `post_`, `conv_`, etc.) stay as strings from `useParams()` and use a presence/format guard; never call `Number()`/`parseInt`. Only explicitly unconverted numeric domains may coerce route params.
- Never import `@tanstack/react-router`
