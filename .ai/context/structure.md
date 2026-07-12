# Structure & Routing

## File Naming

- Components: PascalCase — `ProductListPage.tsx`, `CartSidebar.tsx`
- Hooks: camelCase + `use` prefix — `useAuth.ts`, `useLogin.ts`, `useProduct.ts`
- No `services/` folder — HTTP calls live in `src/api/<domain>.ts` (auth, products, orders, cart, chat, social, …), aggregated into the `api` object by `api/index.ts`
- Types: split by feature/domain under `types/` (e.g. `product.ts`, `order.ts`, `cart.ts`); `types/index.ts` is the barrel — always import from `@/types`

## Folder Structure

```
frontend/src/
├── main.tsx
├── App.tsx                     # QueryClientProvider + AuthProvider + CartProvider
├── router.tsx                  # createBrowserRouter, RequireAuth guard
├── lib/                        # Layered by concern — put new utils in the matching layer
│   ├── format/                 # utils.ts (cn, formatPrice), time.ts, pagination.ts
│   ├── query/                  # queryClient.ts, orderInvalidation.ts
│   ├── realtime/               # socket.ts, chatSound.ts
│   ├── auth/                   # authChannel.ts, roleAccess.ts
│   ├── domain/                 # orderStatus.ts, paymentUrl.ts, sku.ts, sharePost.ts, likedPosts.ts
│   └── http/                   # cloudinary.ts, fetchBatchTolerant.ts
├── api/
│   ├── client.ts               # request() wrapper
│   ├── index.ts                # aggregates domain modules into the `api` object
│   └── auth.ts · products.ts · orders.ts · cart.ts · payment.ts · inventory.ts
│       · chat.ts · social.ts · notifications.ts · reviews.ts · users.ts
│       · upload.ts · unauthorized.ts · misc.ts
├── types/                      # Split by feature/domain; index.ts re-exports (barrel)
│   ├── index.ts                # Barrel — import from '@/types'
│   ├── common.ts               # PaginatedResponse, ApiError, HealthStatus
│   ├── auth.ts · user.ts · catalog.ts · inventory.ts
│   ├── product.ts · cart.ts · payment.ts · order.ts
│   └── social.ts · notification.ts · chat.ts · upload.ts
├── hooks/                      # Layered by concern
│   ├── query/                  # queryKeys.ts (key factory), cartCache.ts
│   ├── auth/                   # useAuth.ts, useRole.ts
│   ├── data/                   # useCart.ts, useProductReviews.ts, useProductsByIds.ts
│   └── ui/                     # useDebouncedValue.ts
├── context/
│   ├── AuthContext.tsx         # AuthProvider + useAuthContext()
│   └── CartContext.tsx         # CartProvider — cart state + localStorage persistence
├── components/
│   ├── ui/                     # shadcn/ui (DO NOT EDIT — write-blocked; install only via `npx shadcn add`)
│   └── shared/                 # Custom shared components: ApiErrorState, Avatar, GradientButton,
│                               # IconButton, LiveBadge, ModalCloseButton, OnlinePill, PageSkeleton,
│                               # Pagination, PriceText, ProductThumb, RichTextEditor, StarRating,
│                               # StatusBadge, TextField, ToggleSwitch. All non-shadcn reusables go here.
├── features/
│   ├── admin/                  # AdminPage, AdminAnalyticsPage, Pending{Brands,Categories}Page, ReportedPostsPage
│   ├── auth/                   # LoginPage.tsx, useLogin.ts
│   ├── cart/                   # CartPage, CartSidebar, CheckoutPage + cart helpers
│   ├── chat/                   # ChatDialog, ChatThread, MessagesPage, useChat, chat*.ts helpers
│   ├── notifications/          # NotificationsPage, notificationSocket, notificationCache, notificationDisplay
│   ├── order/                  # OrderHistory/OrderDetail/SellerOrders/ReturnRequests/ShopAnalytics pages
│   │                           # + analytics/ + order helper modules + use*.ts hooks
│   ├── payment/                # PaymentResultPage
│   ├── product/                # MarketplacePage, ProductDetail, CreateProductPage, useProduct
│   ├── shop/                   # ShopPage
│   ├── social/                 # FeedPage, PostCard, PostDetailPage, CreatePostModal, useFeed/useComments/useFollow
│   └── user/                   # ProfilePage, EditProfileModal, FollowListModal, profileAbout
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
| `/marketplace` | `MarketplacePage` | auth |
| `/product/:id` | `ProductDetail` | auth |
| `/cart` · `/checkout` | `CartPage` · `CheckoutPage` | auth |
| `/orders` · `/order/:id` · `/returns` | order pages | auth |
| `/payment-result` | `PaymentResultPage` | auth |
| `/profile/:id` | `ProfilePage` | auth |
| `/notifications` | `NotificationsPage` | auth |
| `/shop` · `/shop/analytics` | `ShopPage` · `ShopAnalyticsPage` | role: shop |
| `/sell` · `/sell/:id` · `/sell/orders` · `/sell/returns` | seller pages | role: shop |
| `/admin` · `/admin/analytics` · `/admin/reports` · `/admin/{brands,categories}/pending` | admin pages | role: admin |
| `*` (inside layout) | 404 `ApiErrorState` | — |
| `*` (top-level) | `<Navigate to="/" />` | — |

> Don't duplicate the router code here — when adding a route, edit `src/router.tsx` and add a row to this table.

Rules:
- Navigate via `<Link>` / `useNavigate` — never `window.location.href`
- No view-state flags replacing `<Route>` (e.g. `if (page === 'cart')`)
- Route params: `Number(useParams().id)` + `enabled` guard — never `parseInt(id!)`
- Never import `@tanstack/react-router`

