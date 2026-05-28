# API Reference

Backend: NestJS gateway at `http://localhost:3000/api` (env: `VITE_API_URL`).
All calls go through `api` object in `src/api/index.ts`.

## Conventions

- Native `fetch` only (no axios)
- `credentials: 'include'` set globally in `request()` — never per-call
- Response envelope: `{ data: T }` — `request()` unwraps automatically, callers get `T`
- IDs: `number` throughout — never `string`
- Errors: thrown as `ApiError` with `{ message, status, code? }`

## Endpoint Table

| Namespace | Method | Path | Returns |
|---|---|---|---|
| `auth.login` | POST | `/user/login` | `{ user: User }` |
| `auth.register` | POST | `/user/register` | `{ user: User }` |
| `auth.logout` | POST | `/user/logout` | `void` |
| `products.getList` | GET | `/products/with-inventory/all` | `Product[]` |
| `products.getById` | GET | `/products/:id` | `Product` |
| `products.getWithInventory` | GET | `/products/:id/with-inventory` | `ProductWithInventory` |
| `products.getMultipleWithInventory` | POST | `/products/with-inventory/multiple` | `ProductWithInventory[]` |
| `products.create` | POST | `/products` | `Product` |
| `products.getBrands` | GET | `/products/brands` | `Brand[]` |
| `products.getCategories` | GET | `/products/categories` | `Category[]` |
| `orders.create` | POST | `/order` | `Order` |
| `orders.getByUser` | GET | `/order/user/:userId` | `Order[]` |

> **Missing endpoint:** `GET /user/me` — backend has not implemented yet. Auth state falls back to `localStorage` until then. See `useAuth.ts` TODO.

## Usage Pattern

```ts
// api/index.ts (excerpt)
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new ApiError(...);
  const json = await res.json();
  return json.data;
}

export const api = {
  auth: {
    login: (body: LoginDto) => request<{ user: User }>('/user/login', { method: 'POST', body: JSON.stringify(body) }),
    // ...
  },
  products: { /* ... */ },
  orders: { /* ... */ },
};
```

In hooks:
```ts
const { data } = useQuery({
  queryKey: queryKeys.products.list(params),
  queryFn: () => api.products.getList(params),
});
```

## Error Handling

```ts
class ApiError extends Error {
  status: number;
  code?: string;
}
```

- 401 → redirect to `/login` (`useNavigate`, never `window.location`)
- 403 → display permission error UI
- 4xx → show `error.message` to user
- 5xx → show generic "Something went wrong, try again" + log to console

## Adding a New Endpoint

1. Add request function to the appropriate namespace in `api/index.ts`
2. Add response type to `types/index.ts`
3. Add query key to `hooks/queryKeys.ts` if it's a GET (query)
4. Create the hook in `hooks/` or feature folder
5. Use the hook in the component — never call `api.*` directly from JSX
