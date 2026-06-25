# Testing — Vitest + RTL + MSW

> Status: **Infra files present, deps not installed.** Config (`vite.config.ts` `test`), setup (`src/test/setup.ts`), MSW (`src/test/msw/`) and `renderWithProviders` exist, and tests are colocated (`sku.test.ts`, `orderSummary.test.ts`, `sellerOrderActions.test.ts`, `ProductCard.test.tsx`). The dev deps below are **not yet in `package.json`**, so `npm run test:run` can't execute until they're installed (blocked: `npm install`). Tracked as snapshot **P3-01**.
>
> **Rule:** every fix/logic change still ships with a colocated test (see core.md). Prefer extracting logic to a pure helper and unit-testing it; reserve component/hook tests (RTL + MSW) for behaviour that only exists in the component.

## Recommended Stack

| Tool | Purpose |
|---|---|
| Vitest | Test runner — shares Vite config, zero re-config |
| @testing-library/react | Component testing, user-event based |
| @testing-library/jest-dom | DOM matchers (`toBeInTheDocument`, etc.) |
| @testing-library/user-event | Simulate user interactions |
| MSW (Mock Service Worker) | Mock API at the network layer — no `api/index.ts` mocking |
| @testing-library/react-hooks (built into RTL v13+) | Test hooks via `renderHook` |

## One-time Setup

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom msw
```

Add to `vite.config.ts`:
```ts
/// <reference types="vitest" />
export default defineConfig({
  // ...
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run"
}
```

Setup file (`src/test/setup.ts`):
```ts
import '@testing-library/jest-dom';
import { afterEach, afterAll, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());
```

MSW server (`src/test/msw/server.ts`):
```ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

## File Layout

- Component test: co-locate as `Component.test.tsx` next to `Component.tsx`
- Hook test: co-locate as `useFoo.test.ts` next to `useFoo.ts`
- Shared test utilities: `src/test/` (renderWithProviders, MSW handlers)

## Patterns

### Component with React Query

```tsx
// src/test/renderWithProviders.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

export function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
```

### Test a query hook

```ts
import { renderHook, waitFor } from '@testing-library/react';
import { useProduct } from './useProduct';

test('useProduct returns product data', async () => {
  const { result } = renderHook(() => useProduct(1), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: 1, name: 'Test' });
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

### Mock API with MSW

```ts
// src/test/msw/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:3000/api/products/:id', ({ params }) => {
    return HttpResponse.json({ data: { id: Number(params.id), name: 'Mock Product' } });
  }),
];
```

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
