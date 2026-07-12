# API Reference — Frontend Contract

Backend: NestJS gateway at `http://localhost:3000/api` (env: `VITE_API_URL`).
All HTTP calls go through the `api` object exported by `src/api/index.ts`, which aggregates per-domain modules (`src/api/auth.ts`, `products.ts`, `orders.ts`, `cart.ts`, `payment.ts`, `inventory.ts`, `chat.ts`, `social.ts`, `notifications.ts`, `reviews.ts`, `users.ts`, `upload.ts`, `misc.ts`). The `request()` wrapper lives in `src/api/client.ts`.
For the full endpoint catalogue (paths, query params, all fields), see `.ai/context/backend-api.md`.

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

## Finding an endpoint

Don't maintain a duplicate endpoint table here — it drifts. To find an existing method:

1. Open the matching domain file in `src/api/` (e.g. order calls → `src/api/orders.ts`) — each method's path and return type are declared inline.
2. For raw backend details (query params, all response fields), see `.ai/context/backend-api.md`.

Auth note: `api.auth.me` (GET `/user/me`) exists and drives auth state via `useQuery` — the old localStorage user cache has been removed (see `.ai/context/auth.md`).

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

1. Add request function to the matching domain file in `src/api/` (e.g. `src/api/orders.ts`); `index.ts` re-exports it via the `api` object
2. Add response type to `src/types/<domain>.ts` (re-exported by the `types/index.ts` barrel)
3. Add query key to `src/hooks/query/queryKeys.ts` if it's a GET
4. Create the hook in `src/hooks/` or the feature folder
5. Use the hook in the component — never call `api.*` directly from JSX
