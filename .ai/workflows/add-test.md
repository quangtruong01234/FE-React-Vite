# /add-test — Generate Vitest Test for a File

Create a Vitest + React Testing Library test for a component or hook.

## How to invoke

```
/add-test <file>
```

Example:
- `/add-test src/features/auth/useLogin.ts`
- `/add-test src/components/shared/PriceText.tsx`

---

## Protocol

### Step 0 — Reuse the existing infrastructure

Vitest + RTL + MSW are installed and configured. Before writing anything, know what already exists
(details → `.ai/testing.md`):

- `renderWithProviders(ui, { route })` from `@/test/renderWithProviders` — QueryClient + MemoryRouter
- `server` from `@/test/msw/server` + `API_BASE` from `@/test/msw/handlers` for per-test `server.use(...)`
- `onUnhandledRequest: 'error'` — every request the test makes needs a handler

Never mock `fetch` or `api/index.ts`. For **components** use `renderWithProviders` — never build
your own provider wrapper. For **`renderHook`** a local per-test `QueryClientProvider` wrapper is
the established pattern (`renderWithProviders` renders a component, it can't supply `wrapper`).

### Step 1 — Classify the target

| Target | Test type |
|---|---|
| Hook (`use*.ts`) returning `useQuery` / `useMutation` | renderHook + MSW handlers |
| Pure hook (no async, no React Query) | renderHook |
| Component with server data | renderWithProviders + MSW |
| Pure component (props in, JSX out) | render + assertions |
| Utility function in `lib/` | direct call + assertions |

### Step 2 — Read the target file

Understand inputs, outputs, side effects. Do not test what isn't there.

### Step 3 — Generate the test

File location: co-located, `<target>.test.<ext>`.

Templates below — pick one based on Step 1.

#### Template A — Pure utility

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './utils';

// Prices are VND — `1.000 đ`, abbreviated to `triệu đ` at ≥ 1,000,000.
describe('formatPrice', () => {
  it('groups thousands with the vi-VN separator', () => {
    expect(formatPrice(1000)).toBe('1.000 đ');
  });

  it('abbreviates millions', () => {
    expect(formatPrice(1_500_000)).toBe('1.5 triệu đ');
    expect(formatPrice(2_000_000)).toBe('2 triệu đ');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0 đ');
  });

  it('returns the em-dash placeholder for a non-numeric input', () => {
    expect(formatPrice('abc')).toBe('—');
  });
});
```

#### Template B — React Query hook

```tsx
import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { useProduct } from './useProduct';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProduct', () => {
  it('returns product data when the id is present', async () => {
    // onUnhandledRequest: 'error' — every request the hook makes needs a handler
    server.use(
      http.get(`${API_BASE}/products/prod_abc123`, () =>
        HttpResponse.json({ data: { id: 'prod_abc123' } }),
      ),
    );
    // public IDs are opaque strings — pass them through unchanged
    const { result } = renderHook(() => useProduct('prod_abc123'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('prod_abc123');
  });

  it('stays idle when the id is undefined', () => {
    const { result } = renderHook(() => useProduct(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
```

#### Template C — Component with user interaction

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = { id: 'prod_abc123', name: 'Test', price: 1000 };

  it('renders product name and price', () => {
    renderWithProviders(<ProductCard product={mockProduct} onAddToCart={vi.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('1.000 đ')).toBeInTheDocument();
  });

  it('calls onAddToCart when the button is clicked', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    renderWithProviders(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(onAddToCart).toHaveBeenCalledWith('prod_abc123');
  });
});
```

### Step 4 — Cover, don't over-cover

For each target, generate tests in this priority:
1. Happy path (input → expected output)
2. Edge cases (empty, zero, null, boundary values)
3. Error path (if applicable)
4. User interaction (if component has handlers)

Skip:
- Internal implementation details
- shadcn/ui primitives (already tested upstream)
- Pure prop pass-through with no logic

### Step 5 — Verify

```bash
npm run test:run -- <test-file>
```

If failing → debug the test, not the target (target was correct before). If still failing → maybe target has a bug; run `/debug`.

---

## Output Format

```
── Test Generated ────────────────────────────────
  Target: src/features/product/useProduct.ts
  Test:   src/features/product/useProduct.test.ts
  Cases:  3 (happy, idle-when-no-id, error)
  Status: ✅ npm run test:run passed
──────────────────────────────────────────────────
```
