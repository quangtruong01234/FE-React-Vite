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
| `order-detail.buyer.spec.ts` | UI-1 (address), BE-2 + FE-1 (cancel) | ✅ UI-1 read-only; cancel exercises live write-path |
| `product-form.shop.spec.ts` | UI-3 (auto-SKU), BE-4 (fixme) | ✅ UI-3 client-side; BE-4 blocked |
| `payment-retry.buyer.spec.ts` | FE-2 (expired gateway) | ⚠️ needs a *fresh* pending online order |
| `seller-orders.shop.spec.ts` | seller state machine: pending → confirmed → processing (GHN hand-off, or its error banner) | ✅ live write-path — spends 1 pending order of the shop per run; skips when none is left |
| `seller-vouchers.shop.spec.ts` | seller voucher console: create → edit → deactivate → reactivate (API-checked), VOUCHER-GUARD-01 fixed-without-minimum refused client-side | ✅ live write-path — leaves 1 deactivated `E2E-…` code per run (afterEach always switches it off) |
| `theme-persist.public.spec.ts` | THEME-06: saved theme survives a reload and beats the OS setting; pre-paint script sets it with the app bundle blocked (no dark flash) | ✅ signed out, client-side only (writes `localStorage` only) |
| `auth-session-swap.buyer.spec.ts` | AUTH-STALE-01 (context stale after login / logout → login) | ✅ starts signed out, logs in twice via the form — spends 2 of the 10 logins/60s rate limit |

Specs assert the **correct** behavior, so the open bugs are expected to fail
(red) until fixed — that is the point of the suite. `test.skip(...)` guards keep
them green when the required data (cart items / pending order) isn't present.

## Notes

- Selectors prefer roles + visible Vietnamese text (few test-ids in the app).
  When stabilizing, consider adding `data-testid` to the order status badge,
  shipping-address block, and checkout confirm button.
- `e2e/` is intentionally outside every `tsconfig` `include`, so it never blocks
  `npm run build` or the tsc hook.
