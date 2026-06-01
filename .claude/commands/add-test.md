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

### Step 0 — Verify test stack is installed

Check `package.json` devDependencies for: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw`.

If ANY of these are missing:
```
[STOP] Test stack not installed.

Run this first (requires approval — npm install is blocked by default):
  npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom \
    @testing-library/user-event jsdom msw

Then set up vite.config.ts test block + src/test/setup.ts.
Full guide: @testing.md
```

Do not proceed. Do not generate a test file the user cannot run.

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

describe('formatPrice', () => {
  it('formats integer prices with currency', () => {
    expect(formatPrice(1000)).toBe('$1,000');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('$0');
  });

  it('handles negative values', () => {
    expect(formatPrice(-50)).toBe('-$50');
  });
});
```

#### Template B — React Query hook

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProduct } from './useProduct';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useProduct', () => {
  it('returns product data when id is valid', async () => {
    const { result } = renderHook(() => useProduct(1), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(1);
  });

  it('is disabled when id is 0', () => {
    const { result } = renderHook(() => useProduct(0), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
```

#### Template C — Component with user interaction

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = { id: 1, name: 'Test', price: 1000 };

  it('renders product name and price', () => {
    render(<ProductCard product={mockProduct} onAddToCart={vi.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });

  it('calls onAddToCart when button clicked', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();
    render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(onAddToCart).toHaveBeenCalledWith(1);
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
  Cases:  3 (happy, disabled-when-zero, error)
  Status: ✅ npm run test:run passed
──────────────────────────────────────────────────
```

---

**Model:** Sonnet 4.6 | **Effort:** Medium
