# Structure & Routing

## File Naming

- Components: PascalCase — `ProductListPage.tsx`, `CartSidebar.tsx`
- Hooks: camelCase + `use` prefix — `useAuth.ts`, `useLogin.ts`, `useProduct.ts`
- No `services/` folder — all HTTP calls live in `api/index.ts`
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
│   └── index.ts                # request() wrapper + api object
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
│   └── shared/                 # Custom shared components: Avatar, GradientButton, LiveBadge, OnlinePill,
│                               # PriceText, StatusBadge, TextField. All non-shadcn reusable components go here.
├── features/
│   ├── auth/                   # LoginPage.tsx, useLogin.ts
│   ├── cart/                   # CartSidebar.tsx, CheckoutPage.tsx
│   ├── chat/                   # ChatDialog.tsx, ChatThread.tsx, MessagesPage.tsx,
│   │                           # useChat.ts, chatPresenceSocket.ts, chat*.ts helpers
│   ├── notifications/          # notificationSocket.ts, notificationCache.ts
│   ├── order/                  # OrderHistoryPage.tsx
│   └── product/                # ProductListPage.tsx, ProductDetail.tsx,
│                               # CreateProductModal.tsx, useProduct.ts
└── assets/
```

## Where to put new code

- New route-level page → `features/<feature>/<Name>Page.tsx`
- New hook for a feature → same feature folder, co-located
- New shared/reusable component → `components/shared/`
- New cross-cutting hook (used by 2+ features) → `hooks/<layer>/` (`query`/`auth`/`data`/`ui`)
- New cross-cutting util → `lib/<layer>/` (`format`/`query`/`realtime`/`auth`/`domain`/`http`)
- New type → `types/index.ts`
- New API call → `api/<domain>.ts` (+ query key in `hooks/query/queryKeys.ts`)

> Before creating anything: run `/audit-duplicates <name>` first.

## Routing — React Router DOM v7

| Path | Component | Guard |
|---|---|---|
| `/login` | `LoginPage` | public |
| `/` | `ProductListPage` | `RequireAuth` |
| `/product/:id` | `ProductDetail` | `RequireAuth` |
| `/checkout` | `CheckoutPage` | `RequireAuth` |
| `/orders` | `OrderHistoryPage` | `RequireAuth` |
| `*` | `<Navigate to="/" />` | — |

`RequireAuth` reads `currentUser` from `useAuthContext()` → redirects to `/login` if null.
`RootLayout` renders `<Outlet />` + `<CartSidebar />` (always mounted for slide-in UX).

```tsx
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RequireAuth><RootLayout /></RequireAuth>,
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrderHistoryPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

Rules:
- Navigate via `<Link>` / `useNavigate` — never `window.location.href`
- No view-state flags replacing `<Route>` (e.g. `if (page === 'cart')`)
- Route params: `Number(useParams().id)` + `enabled` guard — never `parseInt(id!)`
- Never import `@tanstack/react-router`

