# Conventions — Forms, Components, Lodash, TS, Env

## Naming

- Use meaningful names that describe the value's purpose.
- Avoid vague names (`a`, `b`, `data`, `result`, `temp`, `value`, `obj`, `arr`, `list`) unless the scope is very small and the meaning is obvious.
  - **Exception — TanStack Query destructure:** `const { data, isLoading } = useQuery(...)` is the idiomatic v5 shape; the bare `data` is allowed at the call site. Alias it (`data: products`) when passed further down or when multiple queries coexist.
- `camelCase` for variables and functions; `PascalCase` for React components and TS types/interfaces; `UPPER_SNAKE_CASE` only for module-level constants.
  - **Exception — backend/external mirror:** keep `snake_case` for type fields that mirror a backend or external-API response verbatim (`created_at`, `public_id`, `rol_name`) — see `core.md`. Do NOT rename these.
- Boolean variables must start with `is`, `has`, `can`, `should`, `will`, or `needs`.
- Arrays use plural names (`orders`, `shipments`, `selectedItems`).
- Map/record objects include the key relationship (`orderById`, `statusLabelMap`, `permissionsByRole`).
- Event handlers inside React components use `handleX` (`handleSubmit`, `handleStatusChange`); callback props use `onX` (`onSubmit`, `onStatusChange`).
- **Plain functions/utils** start with a verb (`fetchOrders`, `createShipment`, `calculateShippingFee`, `formatCurrency`). This does NOT apply to React components (PascalCase noun, e.g. `ProductCard`) or hooks (fixed `use` prefix, e.g. `useAuth`).
- Name API payloads/responses clearly (`loginPayload`, `loginResponse`, `createOrderPayload`).
- Include units when relevant (`timeoutMs`, `priceVnd`, `weightGram`, `retryCount`).
- Use this project's domain terms consistently: `order`, `OrderStatus`, `orderItem`, `ghnOrderCode` (mã vận đơn GHN), `shippingAddress`, `shippingFee`, `paymentMethod`, `sku`, `product`. There is no separate `shipment` entity, and GHN is the sole carrier — do not invent `trackingCode`, `ghnStatus`, or `logisticsOperator`.

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
  onAddToCart: (id: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) { ... }
```

## Form Handling

**Khi nào dùng gì:**
- Simple forms (≤ 3 field, không cần validate): `useState` thuần
- Mọi form còn lại (validate, nhiều field, type-safe): `react-hook-form` + `zod`

**Pattern chuẩn:**

```tsx
// 1. Schema co-locate trong cùng feature folder: features/<feature>/<feature>.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Bắt buộc'),
  password: z.string().min(1, 'Bắt buộc'),
});
export type LoginFormData = z.infer<typeof loginSchema>;
```

```tsx
// 2. Component — native input (Input, TextField)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors, isSubmitting } } =
  useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

<input {...register('username')} />
{errors.username && <p>{errors.username.message}</p>}
```

```tsx
// 3. shadcn Select / Textarea / Checkbox → dùng Controller
import { Controller } from 'react-hook-form';

<Controller
  name="paymentMethod"
  control={control}
  render={({ field }) => (
    <Select onValueChange={field.onChange} value={field.value}>
      ...
    </Select>
  )}
/>
```

**Rules:**
- Schema file: `src/features/<feature>/<feature>.schema.ts` — không đặt inline trong component
- `z.infer<typeof schema>` làm type cho form data — không khai báo interface riêng
- Native inputs (`Input`, `TextField`): dùng `register`
- shadcn components (`Select`, `Textarea`, `Checkbox`): dùng `Controller`
- Server error (từ API 400/422): set vào form bằng `setError('root', { message: err.message })`
- Không reset validate thủ công sau khi RHF đã cover

## State Management

- **Server state** → TanStack Query (products, orders, user data)
- **UI state** → `useState` / `useReducer` (modal open, form input, selected tab)
- **Global client state** → React Context only when truly cross-cutting. `AuthContext` is currently the **only** one — cart is server state (`hooks/data/useCart.ts` + `hooks/query/cartCache.ts`), not a context.
- Never use TanStack Query for pure UI state
**Zustand — chưa install. Chỉ thêm khi có đúng 1 trong các trigger sau:**

| Trigger | Ví dụ cụ thể trong TryBuy |
|---|---|
| Context re-render performance thực sự đo được | AuthContext thay đổi liên tục làm re-render cả header + layout + unrelated routes |
| State cần tồn tại qua nhiều route của cùng 1 flow | Multi-step checkout wizard (shipping → payment → review) — quá phức tạp cho URL params, quá transient cho server |
| State cần đọc/write ngoài React tree | Utility fn / service worker cần đọc cart hoặc session state mà không thể dùng hook |
| Shared filter/sort state phức tạp giữa ≥3 feature area | AdminOrders + AdminUsers + AdminProducts cùng đọc/ghi 1 filter state, prop drilling hoặc context provider wrapper trở nên unwieldy |

**Không phải trigger:**
- Thêm 1–2 field vào AuthContext → vẫn dùng Context
- Muốn tránh prop drilling cho 2 level → dùng Context
- "Context trông verbose" → không đủ lý do

**Quy trình nếu muốn thêm Zustand:**
1. Mô tả trigger cụ thể (row nào trong bảng trên)
2. Claude.ai evaluate → confirm hoặc đề xuất alternative
3. Chỉ khi được confirm mới `npm install zustand` (blocked by default)
4. Store file: `src/store/<name>.store.ts` — không đặt trong `context/` hay `hooks/`

Redux và Jotai: không thêm vào project này trong mọi trường hợp.

## Lodash

**Always import per-method** — `import _ from 'lodash'` kills tree-shaking and is flagged 🔴 by `/check-perf`.

```ts
// ✅
import debounce from 'lodash/debounce';
import groupBy from 'lodash/groupBy';

// ❌ never
import _ from 'lodash';
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

- `formatPrice()` from `lib/format/utils.ts` for all price display — never inline `toLocaleString`
- No `console.log` in committed code (`console.error` for genuine errors is OK)
- No TODO comments without a ticket reference or owner
