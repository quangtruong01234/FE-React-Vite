# Data Fetching — TanStack Query v5

## QueryClient setup

```ts
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

## Query Keys — centralize always

All keys in `hooks/queryKeys.ts`. **IDs are `number`, not `string`.**

```ts
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: ProductParams) => ['products', 'list', params] as const,
    detail: (id: number) => ['products', id] as const,
    withInventory: (id: number) => ['products', id, 'inventory'] as const,
  },
  orders: {
    all: ['orders'] as const,
    byUser: (userId: number) => ['orders', 'user', userId] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
};
```

> **Known inconsistency:** `useProduct.ts` currently uses inline `['products']`. New code MUST use `queryKeys.*` — do not propagate the inline pattern.

## useQuery pattern

```ts
export function useProducts(params: ProductParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => api.products.getList(params),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api.products.getById(id),
    enabled: id > 0,   // guard against 0/NaN from useParams
  });
}
```

Deriving id from route params:
```ts
const { id } = useParams();
const productId = Number(id);
const { data } = useProduct(productId);   // enabled guards NaN
```

## useMutation pattern

```ts
export function useCreateOrder() {
  return useMutation({
    mutationFn: (data: CreateOrderDto) => api.orders.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (error: ApiError) => {
      console.error('Create order failed', error);
    },
  });
}
```

## In components

```tsx
// ✅ v5 syntax
const { data, isLoading, error } = useProducts({ page: 1 });
const { mutate: createOrder, isPending } = useCreateOrder();

// ❌ v4 — broken in v5
const { isLoading } = useMutation(...);   // use isPending on mutations
```

## Error handling

- Queries: handle via `error` from the hook return → render fallback UI
- Mutations: handle via `onError` callback → log + UI feedback
- No `sonner`/toast in stack yet — use `console.error` + UI state
- No global error toast yet — pending decision

## Hard rules recap

- ❌ NO `useState` + `useEffect` to fetch — `/review` flags this
- ❌ NO `fetch()` directly in components — use `api` from `api/index.ts`
- ❌ NO manual `loading`/`error` state for server data
- ✅ Always use the `queryKeys.*` factory
- ✅ Mutations: `isPending` not `isLoading`
- ✅ Invalidate related queries in `onSuccess`
