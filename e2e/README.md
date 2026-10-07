# E2E (Playwright)

Two layers (procedure: `../.ai/workflows/e2e.md`):

- **Smoke** — `routes.ts` lists every route in `src/router.tsx` with its role;
  `smoke.{buyer,shop,admin,public}.spec.ts` open each one (runner: `smoke.ts`).
  `src/router.test.ts` fails `npm run test:run` when the router and the manifest
  disagree, so a new route is smoke-covered as soon as it has a row.
- **Deep** — one flow per spec, listed in the route's `deep` array. The first
  ones encode `../.ai/agent-handoff/e2e-payment-audit-2026-06-26.md`.

## Install (one-time)

`npm install` is blocked for the agent, so **a human must run these**:

```bash
npm install                       # resolves @playwright/test (already in package.json)
npx playwright install chromium   # downloads the browser binary
```

## Run

```bash
npm run test:e2e            # headless, all projects
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:report    # open last HTML report
npx playwright test e2e/order-detail.buyer.spec.ts   # single spec
```

Prereqs: Vite dev server auto-starts (port 5173); **backend must be running on
:3000**. The `setup` project logs in as buyer + shop + admin and caches cookies
in `e2e/.auth/` (gitignored). Admin needs `E2E_ADMIN_USERNAME` /
`E2E_ADMIN_PASSWORD` — copy `.env.example` to `.env.local` (gitignored) or export
them; without them the `admin` project is skipped. Specs read ids at run time
through `api.ts` (public ids, never `Number()`).

```bash
npx playwright test --project=shop -g "/sell/orders "   # one route's smoke
```

## Spec → audit map

| Spec | Audit items | Runs today? |
| --- | --- | --- |
| `smoke.<role>.spec.ts` | every route in `routes.ts` + role gates + 404 control | ✅ read-only; `:id` routes skip if the role has no such record |
| `payment-result.buyer.spec.ts` | success/cancel render (P0-04) | ✅ gateway call mocked |
| `checkout-resilience.buyer.spec.ts` | BE-3, FE-3, FE-4 | ✅ enrichment 500 forced via route mock (needs items in buyer cart) |
| `order-detail.buyer.spec.ts` | UI-1 (address), ORDER-TIMELINE-01 (history card starts with "Đặt hàng"; skips while the route 404s), BE-2 + FE-1 (cancel) | ✅ UI-1 + timeline read-only; cancel exercises live write-path |
| `product-form.shop.spec.ts` | UI-3 (auto-SKU), BE-4 (fixme) | ✅ UI-3 client-side; BE-4 blocked |
| `payment-retry.buyer.spec.ts` | FE-2 (expired gateway) | ⚠️ needs a *fresh* pending online order |
| `seller-orders.shop.spec.ts` | seller state machine: pending → confirmed → processing (GHN hand-off, or its error banner) | ✅ live write-path — spends 1 pending order of the shop per run; skips when none is left |
| `seller-vouchers.shop.spec.ts` | seller voucher console: create → edit → deactivate → reactivate (API-checked), VOUCHER-GUARD-01 fixed-without-minimum refused client-side | ✅ live write-path — leaves 1 deactivated `E2E-…` code per run (afterEach always switches it off) |
| `theme-persist.public.spec.ts` | THEME-06: saved theme survives a reload and beats the OS setting; pre-paint script sets it with the app bundle blocked (no dark flash) | ✅ signed out, client-side only (writes `localStorage` only) |
| `return-request.buyer.spec.ts` | buyer return flow: `/order/:id` form → pending panel (order `return_requested`) → listed on `/returns` | ✅ live write-path — needs a completed order the buyer placed with the shop account; the shop rejects it in `finally`, so the order is back to `completed` |
| `seller-returns.shop.spec.ts` | seller rejects a pending return with a reason → order restored, request under "Từ chối" (reject branch only — approve is a one-way refund) | ✅ live write-path — seeds an `[E2E]` request through the buyer context when none is pending; never touches untagged requests |
| `cart.buyer.spec.ts` | quantity +1/−1 persisted (API-checked), empty selection blocks ordering, partial selection carries into `/checkout` | ✅ leaves the cart as found (needs ≥2 lines; checkout opened, never confirmed) |
| `order-history.buyer.spec.ts` | full-history badge counts, status tab narrows server-side, order-code search → detail | ✅ read-only |
| `post-moderation.admin.spec.ts` | reported post: hide resolves the report (leaves "Chờ xử lý") → unhide on "Đã xử lý" | ✅ seeds an `[E2E]` post (buyer) + report (shop), deletes the post in `finally` |
| `catalog-review.admin.spec.ts` | `/admin/brands/pending` + `/admin/categories/pending`: approve one submission, reject another with a reason (both API-checked) | ✅ live write-path — the shop submits 2 `[E2E]` rows per page; `finally` rejects both (no delete endpoint), so each run leaves 2 rejected brands + 2 rejected categories and 4 review notifications to the shop |
| `product-risk.admin.spec.ts` | rescore one shop product → toast + card show the returned score; "Rủi ro cao" keeps the card only at ≥ 70 | ✅ rescore is recomputed, safe to repeat; feedback buttons not exercised (they write audit records); skips when the shop has no product |
| `auth-session-swap.buyer.spec.ts` | AUTH-STALE-01 (context stale after login / logout → login) | ✅ starts signed out, logs in twice via the form — spends 2 of the 10 logins/60s rate limit |
| `product-detail.buyer.spec.ts` | `/product/:id` heart → listed on `/wishlist` → removed there; add 2 units → cart line (both API-checked) | ✅ wishlist membership and cart quantity restored to what they were |
| `address-book.buyer.spec.ts` | `/addresses` add (GHN province → district → ward chain) → edit → delete, default never moves (API-checked) | ✅ deletes its own address in `finally`; puts the default back if it moved |
| `profile.buyer.spec.ts` | `/profile/:id` owner rename shows in the header; EMAIL-REAUTH-01 (password field only while the email differs, required, wrong password stays on the field with no `/login` bounce); follow counts once and survives a reload → unfollow | ✅ name restored in `finally`; the email is never actually changed (wrong password only); follow state ends where it started |
| `post-detail.buyer.spec.ts` | `/post/:id` like → still liked after reload (POST-LIKE-STATE fix) → unlike; comment via the send button; owner delete → back on `/` | ✅ creates its own `[E2E]` post, deletes it through the UI (`finally` as backup) |
| `feed.buyer.spec.ts` | `/` publish from the header composer → server search finds the card → like/unlike from the card → edit via the card menu → delete from the card menu (all API-checked) | ✅ creates its own `[E2E]` post, deletes it through the UI (`finally` as backup) |
| `messages.buyer.spec.ts` | `/profile/:shopId` "Nhắn tin" → `/messages` send → "Đã gửi" (never "Gửi thất bại") → still there after a reload (CHAT-E2E-CLEANUP-01) | ✅ hard-deletes its own `[E2E]` message in `finally` via `DELETE /api/chat/messages/:id` (the empty conversation row stays) — written 2026-10-03, not yet run against a live backend |
| `shop-catalogue.shop.spec.ts` | `/shop` SKU search + hide/show switch (API-checked) + delete cancelled; `/sell/:id` rename lands; `/shop/analytics` monthly interval matches the server summary | ✅ re-shows and renames back in `finally`; skips when the shop has no visible single-SKU product |
| `admin-vouchers.admin.spec.ts` | `/admin/vouchers` create switched off → search → on → off through the confirm modal (API-checked) | ✅ leaves 1 deactivated `E2E-…` platform code per run (afterEach switches it off) |
| `admin-dashboard.admin.spec.ts` | `/admin` user search + role change confirm (cancelled, role unchanged) and self-row lock; `/admin/analytics` interval/preset drive the request; CSV export downloads | ✅ read-only — the role change is always cancelled |
| `mobile-layout.buyer.spec.ts` | MOBILE-OVERFLOW-01: no horizontal overflow at 360 + 390px on `/`, `/marketplace`, `/cart`, `/checkout`, `/orders`, `/product/:id`; a tap on "ĐẶT HÀNG" opens `/checkout` | ✅ read-only — checkout opened, never confirmed; the tap test skips on an empty cart |
| `routes.perf.spec.ts` | PERF-E2E-01: LCP / CLS / blocking time (median of 3) on `/marketplace`, `/cart`, `/checkout`, `/orders`, `/order/:id`, `/sell` | ✅ `npm run test:perf` only (own `perf` project on `vite preview` :4173, not part of `test:e2e`) — read-only |

Specs assert the **correct** behavior, so the open bugs are expected to fail
(red) until fixed — that is the point of the suite. `test.skip(...)` guards keep
them green when the required data (cart items / pending order) isn't present.

## Notes

- Selectors prefer roles + visible Vietnamese text (few test-ids in the app).
  When stabilizing, consider adding `data-testid` to the order status badge,
  shipping-address block, and checkout confirm button.
- `e2e/` is intentionally outside every `tsconfig` `include`, so it never blocks
  `npm run build` or the tsc hook.
