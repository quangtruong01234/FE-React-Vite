# API Reference — Frontend Contract

Backend: NestJS gateway at `http://localhost:3000/api` (env: `VITE_API_URL`).
All HTTP calls go through the `api` object in `src/api/index.ts`.
For full backend endpoint details (paths, query params, all fields), see `.ai/context/backend-api.md`.

## Conventions

- Native `fetch` only — no axios
- `credentials: 'include'` is global in `request()` — never add it per-call
- IDs are `number` everywhere — never `string`
- Errors thrown as `ApiError`: `{ status: number, message: string }`

## Response Envelope

Every backend response goes through `ResponseInterceptor` (gateway-level):

```ts
// Raw HTTP body — every successful endpoint
{
  statusCode: number;
  status: "success";
  message: string;
  timestamp: string; // ISO 8601
  data: T;           // ← actual payload
}
```

`request()` detects the `data` key and unwraps automatically — callers always receive bare `T`.

### Paginated endpoints

For paginated endpoints `T` is `PaginatedResponse<X>`. The `ResponseInterceptor` wraps the full object, so `request()` unwraps to `PaginatedResponse<X>` with all pagination metadata intact:

```ts
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
}
```

## Endpoint Table

| Namespace | Method | Path | Returns (after unwrap) |
|---|---|---|---|
| `api.auth.login` | POST | `/user/login` | `User` |
| `api.auth.register` | POST | `/user/register` | `User` |
| `api.auth.logout` | POST | `/user/logout` | `void` |
| `api.products.getList` | GET | `/products/with-inventory/all` | `PaginatedResponse<ProductWithInventory>` |
| `api.products.getWithInventory` | GET | `/products/:id/with-inventory` | `ProductWithInventory` |
| `api.products.getMultipleWithInventory` | POST | `/products/with-inventory/multiple` | `ProductWithInventory[]` |
| `api.products.create` | POST | `/products` | `Product` |
| `api.products.getBrands` | GET | `/products/brands` | `Brand[]` |
| `api.products.getCategories` | GET | `/products/categories` | `Category[]` |
| `api.orders.create` | POST | `/order` | `Order` |
| `api.orders.getByUser` | GET | `/order/user/:userId` | `PaginatedResponse<Order>` |

> `GET /user/me` — backend has shipped this endpoint but the FE `api` object has no method for it yet.
> Auth state still uses the localStorage fallback. See `.ai/context/auth.md` FOLLOW-UP for the migration task.

## request() — how it works

```ts
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    const apiError: ApiError = { status: res.status, message: err.message ?? res.statusText };
    throw apiError;
  }
  const json = await res.json() as T | { data: T };
  // Unwrap ResponseInterceptor envelope { ..., data: T } when present
  if (json !== null && typeof json === 'object' && 'data' in json && !Array.isArray(json)) {
    return (json as { data: T }).data;
  }
  return json as T;
}
```

In hooks:

```ts
const { data } = useQuery({
  queryKey: queryKeys.products.list(params),
  queryFn: () => api.products.getList(params),
});
// data is PaginatedResponse<ProductWithInventory> | undefined
// access data.data for the items array, data.total for count, etc.
```

## Error Handling

- 401 → redirect to `/login` via `useNavigate` (never `window.location`)
- 403 → display permission error UI
- 4xx → show `error.message` to user
- 5xx → show generic "Something went wrong, try again" + log to console

## Adding a New Endpoint

1. Add request function to the appropriate namespace in `src/api/index.ts`
2. Add response type to `src/types/index.ts`
3. Add query key to `src/hooks/queryKeys.ts` if it's a GET
4. Create the hook in `src/hooks/` or the feature folder
5. Use the hook in the component — never call `api.*` directly from JSX
