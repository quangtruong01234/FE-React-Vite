# E2E (Playwright) — Payment / Order audit suite

Specs encode the checklist in `../.ai/agent-handoff/e2e-payment-audit-2026-06-26.md`.

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
:3000**. The `setup` project logs in as buyer + shop and caches cookies in
`e2e/.auth/` (gitignored).

## Spec → audit map

| Spec | Audit items | Runs today? |
| --- | --- | --- |
| `payment-result.buyer.spec.ts` | success/cancel render (P0-04) | ✅ gateway call mocked |
| `checkout-resilience.buyer.spec.ts` | BE-3, FE-3, FE-4 | ✅ enrichment 500 forced via route mock (needs items in buyer cart) |
| `order-detail.buyer.spec.ts` | UI-1 (address), BE-2 + FE-1 (cancel) | ✅ UI-1 read-only; cancel exercises live write-path |
| `product-form.shop.spec.ts` | UI-3 (auto-SKU), BE-4 (fixme) | ✅ UI-3 client-side; BE-4 blocked |
| `payment-retry.buyer.spec.ts` | FE-2 (expired gateway) | ⚠️ needs a *fresh* pending online order |

Specs assert the **correct** behavior, so the open bugs are expected to fail
(red) until fixed — that is the point of the suite. `test.skip(...)` guards keep
them green when the required data (cart items / pending order) isn't present.

## Notes

- Selectors prefer roles + visible Vietnamese text (few test-ids in the app).
  When stabilizing, consider adding `data-testid` to the order status badge,
  shipping-address block, and checkout confirm button.
- `e2e/` is intentionally outside every `tsconfig` `include`, so it never blocks
  `npm run build` or the tsc hook.
