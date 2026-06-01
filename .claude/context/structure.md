# Structure & Routing

## File Naming

- Components: PascalCase — `ProductListPage.tsx`, `CartSidebar.tsx`
- Hooks: camelCase + `use` prefix — `useAuth.ts`, `useLogin.ts`, `useProduct.ts`
- No `services/` folder — all HTTP calls live in `api/index.ts`
- Types: all in `types/index.ts`

## Folder Structure

```
frontend/src/
├── main.tsx
├── App.tsx                     # QueryClientProvider + AuthProvider + CartProvider
├── router.tsx                  # createBrowserRouter, RequireAuth guard
├── lib/
│   ├── queryClient.ts          # TanStack QueryClient config
│   └── utils.ts                # cn(), formatPrice()
├── api/
│   └── index.ts                # request() wrapper + api object
├── types/
│   └── index.ts                # All TypeScript interfaces
├── hooks/
│   ├── queryKeys.ts            # Centralized query key factory
│   └── useAuth.ts              # Auth state + logout mutation
├── context/
│   ├── AuthContext.tsx         # AuthProvider + useAuthContext()
│   └── CartContext.tsx         # CartProvider — cart state + localStorage persistence
├── components/
│   ├── ui/                     # shadcn/ui (DO NOT EDIT)
│   └── shared/                 # Avatar, GradientButton, LiveBadge, OnlinePill, PriceText, TextField
├── features/
│   ├── auth/                   # LoginPage.tsx, useLogin.ts
│   ├── cart/                   # CartSidebar.tsx, CheckoutPage.tsx
│   ├── order/                  # OrderHistoryPage.tsx
│   └── product/                # ProductListPage.tsx, ProductDetail.tsx, ChatRoom.tsx,
│                               # CreateProductModal.tsx, useProduct.ts
└── assets/
```

## Where to put new code

- New route-level page → `features/<feature>/<Name>Page.tsx`
- New hook for a feature → same feature folder, co-located
- New shared/reusable component → `components/shared/`
- New cross-cutting hook (used by 2+ features) → `hooks/`
- New type → `types/index.ts`
- New API call → `api/index.ts` (+ query key in `hooks/queryKeys.ts`)

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

---

## FOLLOW-UP: Move ChatRoom.tsx to features/chat/

**Current location:** `src/features/product/ChatRoom.tsx`
**Should be:** `src/features/chat/ChatRoom.tsx` (new folder)

`ChatRoom.tsx` implements chat UI — it has no product-specific logic and belongs with the Chat WS gateway (port 3011), not with product browsing. It is currently a mock placeholder so the move is low-risk, but it should be done as a dedicated PR to avoid noise in the WS implementation PR.

When moving:
- Create `src/features/chat/` folder
- Update the import in `src/features/product/ProductDetail.tsx` (or wherever `ChatRoom` is consumed)
- Update `context/structure.md` folder map to list `features/chat/`
