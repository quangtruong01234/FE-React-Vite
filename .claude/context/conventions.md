# Conventions — Forms, Components, Lodash, TS, Env

## Component Rules

- Functional components only — no class components
- Props always typed with explicit `interface`
- One component per file for route-level pages; co-locate tightly coupled sub-components
- Business logic in hooks, not inline JSX
- Children typed as `React.ReactNode` — never `JSX.Element[]`
- Do not use `React.FC` — plain function declaration with typed props

```tsx
interface ProductCardProps {
  product: Product;
  onAddToCart: (id: number) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) { ... }
```

## Form Handling

- Simple forms: controlled `useState`
- Complex forms (multi-step, complex validation): `react-hook-form` + `zod` — **neither installed yet**, ask before adding

```tsx
const [formData, setFormData] = useState({ email: '', password: '' });

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
};
```

## State Management

- **Server state** → TanStack Query (products, orders, user data)
- **UI state** → `useState` / `useReducer` (modal open, form input, selected tab)
- **Global client state** → React Context only when truly cross-cutting (`AuthContext`, `CartContext`)
- Never use TanStack Query for pure UI state
- **Do not add** Zustand / Redux / Jotai without explicit approval

## Lodash

```ts
import _ from 'lodash';
// or tree-shake:
import debounce from 'lodash/debounce';
import groupBy from 'lodash/groupBy';
```

✅ Use for: `debounce`, `throttle`, `groupBy`, `orderBy`, `uniqBy`, `pick`, `omit`, `cloneDeep`
❌ Do NOT use for: `map`, `filter`, `find`, `reduce` — native JS handles these.

## TypeScript

- Strict mode — `tsc --noEmit` must pass
- No `any` — use `unknown` + narrowing
- No `!` non-null assertions — use proper guards
- No `@ts-ignore` / `@ts-expect-error` without a ticket-referenced comment
- Explicit return types on non-trivial exported functions
- API response types in `types/index.ts`, reused everywhere
- Catch blocks: `catch (error: unknown)` then narrow

## Environment Variables

- Prefix: `VITE_*` (Vite exposes only these to client)
- Access: `import.meta.env.VITE_*`
- Never read `process.env.*` — doesn't exist in Vite client code
- Document new vars in `.env.example` immediately
- Never edit `.env` / `.env.local` (blocked in settings.json)

## Misc

- `formatPrice()` from `lib/utils.ts` for all price display — never inline `toLocaleString`
- No `console.log` in committed code (`console.error` for genuine errors is OK)
- No TODO comments without a ticket reference or owner
