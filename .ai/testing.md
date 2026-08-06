# Testing — Vitest + RTL + MSW

> Status: **Fully installed and running.** Vitest + RTL + MSW deps are in `package.json`; config (`vite.config.ts` `test`), setup (`src/test/setup.ts`), MSW (`src/test/msw/`) and `renderWithProviders` all exist. Tests are colocated next to their modules. Run `npm run test:run` — keep it green.
>
> **Rule:** every fix/logic change ships with a colocated test (see core.md). Prefer extracting logic to a pure helper and unit-testing it; reserve component/hook tests (RTL + MSW) for behaviour that only exists in the component.
>
> **E2E:** Playwright, specs under `e2e/`. Unit/component stays the default — see [E2E (Playwright)](#e2e-playwright) below before writing one.

## Recommended Stack

| Tool | Purpose |
|---|---|
| Vitest | Test runner — shares Vite config, zero re-config |
| @testing-library/react | Component testing, user-event based |
| @testing-library/jest-dom | DOM matchers (`toBeInTheDocument`, etc.) |
| @testing-library/user-event | Simulate user interactions |
| MSW (Mock Service Worker) | Mock API at the network layer — no `api/index.ts` mocking |
| @testing-library/react-hooks (built into RTL v13+) | Test hooks via `renderHook` |

## Existing infrastructure — use it, don't rebuild it

| File | What it gives you |
|---|---|
| `src/test/setup.ts` | jest-dom matchers, RTL `cleanup`, MSW `server.listen/resetHandlers/close` (`onUnhandledRequest: 'error'`) |
| `src/test/renderWithProviders.tsx` | `renderWithProviders(ui, { route })` — fresh `QueryClient` (retries off) + `MemoryRouter` |
| `src/test/msw/server.ts` | the shared `server` — import it to add per-test handlers |
| `src/test/msw/handlers.ts` | default handlers + `API_BASE` (`http://localhost:3000/api`) |

Never mock `fetch` or `api/index.ts` — stub at the network layer with `server.use(...)`. Because
`onUnhandledRequest` is `'error'`, any request your test doesn't have a handler for **fails the
test** — add the handler rather than loosening the setting.

Provider rule:
- **Component** → `renderWithProviders(...)`. Never build your own `QueryClientProvider` +
  `MemoryRouter` wrapper.
- **Hook via `renderHook`** → build a local wrapper in the test file (`renderWithProviders` renders
  a component; it can't supply `renderHook`'s `wrapper`). Keep it to a fresh per-test
  `QueryClient` with `retry: false` — see `src/features/product/useProducts.test.tsx`.

Scripts: `npm run test` (watch) · `npm run test:run` (CI) · `npm run test:ui`.

## File Layout

- Component test: co-locate as `Component.test.tsx` next to `Component.tsx`
- Hook test: co-locate as `useFoo.test.ts` next to `useFoo.ts`
- Shared test utilities: `src/test/` (renderWithProviders, MSW handlers)

## Patterns

### Component with React Query

```tsx
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

renderWithProviders(<ProductCard product={mockProduct} />, { route: '/marketplace' });
expect(screen.getByText('Mock Product')).toBeInTheDocument();
```

### Test a query hook

```tsx
import type { ReactElement, ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { useProduct } from './useProduct';

function setup(): { wrapper: ({ children }: { children: ReactNode }) => ReactElement } {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

test('useProduct returns product data', async () => {
  server.use(
    http.get(`${API_BASE}/products/prod_abc123`, () =>
      HttpResponse.json({ data: { id: 'prod_abc123' } }),
    ),
  );
  const { wrapper } = setup();
  // public IDs are opaque strings — never Number()/parseInt
  const { result } = renderHook(() => useProduct('prod_abc123'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.id).toBe('prod_abc123');
});
```

### Test user interaction

```tsx
import userEvent from '@testing-library/user-event';

test('adds product to cart', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ProductCard product={mockProduct} />);
  await user.click(screen.getByRole('button', { name: /add to cart/i }));
  expect(screen.getByText(/added/i)).toBeInTheDocument();
});
```

### Mock API with MSW — per-test override

```ts
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { http, HttpResponse } from 'msw';

server.use(
  http.get(`${API_BASE}/products/:id`, ({ params }) =>
    // `request()` unwraps a { data } envelope — mirror that here
    HttpResponse.json({ data: { id: params.id, name: 'Mock Product' } }),
  ),
);
```

Put shared handlers in `src/test/msw/handlers.ts`; keep one-off shapes in the test via `server.use`.

## What to Test (priority order)

1. **Custom hooks** with business logic (cart math, query key construction, auth flows)
2. **Pure utility functions** in `lib/` (`formatPrice`, `cn`)
3. **Form validation** in feature components
4. **Critical user flows** (login, add to cart, checkout) — happy path + error path
5. Skip: shadcn/ui primitives (already tested upstream), pure presentational components without logic

## What NOT to Test

- Implementation details (internal state names, function call counts)
- Third-party library internals (TanStack Query, React Router)
- Visual styling (use Storybook + visual regression later if needed)

---

## E2E (Playwright)

Operational detail (install, per-spec runs, the spec → audit-item map, selector conventions) lives
in **`e2e/README.md`** — read it before touching the suite. This section is only the decision rule
and the parts an agent gets wrong.

### When e2e — and when not

Vitest + MSW is the default and covers almost everything. Reach for e2e **only** when the thing
under test cannot exist in a single mounted tree:

| Write e2e | Write unit/component instead |
|---|---|
| Flow crosses **pages** and real navigation (checkout → gateway → `/payment/result` → `/order/:id`) | Anything expressible as "given this input, this output" → pure helper |
| Behaviour depends on **real backend state** (an order actually transitioning, a live 409) | A specific response shape → `server.use(...)` |
| Behaviour depends on **real cookies / session** across reloads | Auth logic reachable via `renderWithProviders` |
| Regression on a bug that only reproduced **in the browser** (real redirect, real storage) | Render output, conditional UI, form validation |

The suite's purpose is narrow: it encodes the payment/order audit checklist in
`agent-handoff/e2e-payment-audit-2026-06-26.md`. **Don't grow it into a general UI suite** — every
spec added there costs a live backend and a human-run browser install.

### Running it

```bash
npm run test:e2e          # headless, all projects
npm run test:e2e:ui       # UI mode
npm run test:e2e:report   # last HTML report
```

Two prerequisites, and **neither is something you can fix yourself**:

1. **Browser binary.** `npm install` is blocked for agents (`settings.json`), so `npx playwright
   install chromium` must be run by the user. If e2e fails with a missing-executable error, that's
   this — ask, don't retry.
2. **Backend on `:3000` must be live.** The Vite dev server auto-starts (`webServer` in
   `playwright.config.ts`, `reuseExistingServer: true`); the backend does not. E2E here is *not*
   mocked end to end.

So: **`npm run test:e2e` is not part of the gate.** The gate stays `build` + `lint` + `test:run`
(all three runnable offline). Never report a task blocked because e2e didn't run.

### Auth / seeding

- The `setup` project logs in through the real `/login` UI as **buyer** + **shop** and caches
  cookies to `e2e/.auth/*.json` (gitignored). Specs never log in themselves.
- Projects are role-scoped by filename: `*.buyer.spec.ts` → buyer state, `*.shop.spec.ts` → shop
  state. **A new spec must carry one of those two infixes** or it inherits no session.
- Credentials live in `e2e/accounts.ts` — a deliberate in-repo mirror of
  `../.agent-local/test-accounts.md`, so the suite stays self-contained. Keep them in sync by hand;
  don't import across the repo boundary.
- `workers: 1` / `fullyParallel: false` — specs share one backend and real data, so they are
  sequential on purpose. Don't "optimize" that.

### Two things that look like failures but aren't

- **Red specs can be correct.** Specs assert the *intended* behaviour, so open bugs are expected to
  fail until fixed — that's the point of the suite. Check the spec → audit map in `e2e/README.md`
  before treating red as a regression you introduced.
- **`test.skip(...)` guards** keep specs green when required data (cart items, a fresh pending
  online order) isn't present. A skipped spec means "data missing", not "passed".

### Constraints

- `e2e/` sits outside every `tsconfig` `include` (root config is `"include": ["src"]`), so it never
  blocks `npm run build`. The flip side: **e2e code is not typechecked by the gate** — a type error
  there only surfaces when Playwright runs.
- Few `data-testid`s exist; selectors prefer roles + visible Vietnamese text. When a selector is
  flaky, adding a `data-testid` to the component is the sanctioned fix.
