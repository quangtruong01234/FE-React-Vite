# Performance — Choosing the Smooth Path

> Read when adding or editing components, hooks, lists, or anything that renders/computes on the hot path. Goal: keep the UI smooth by default. This is NOT a license to over-optimize — see "When NOT to optimize" at the end.

## Default mindset
- Pick the better complexity/render approach UP FRONT — cheaper than optimizing later. But never add memoization/abstraction speculatively.
- Judge the hot path: code inside a list row or a frequently re-rendered component matters; a one-off page does not. Optimize the former, leave the latter simple.

## Algorithmic complexity
- No O(n²) in render. Don't nest `.find()`/`.filter()` inside `.map()` over the same data — build a `Map`/`Set` lookup once, then O(1) per item.
```ts
  // ❌ O(n*m)
  rows.map(r => ({ ...r, user: users.find(u => u.id === r.userId) }))
  // ✅ O(n+m)
  const byId = new Map(users.map(u => [u.id, u]));
  rows.map(r => ({ ...r, user: byId.get(r.userId) }));
```
- Compute derived data once (above the return), not repeatedly in JSX.
- Heavy pure computation with stable inputs → `useMemo`. Trivial computation → leave it; `useMemo` has its own cost.

## Rendering
- Business logic in hooks, JSX thin (also conventions.md).
- Don't create new objects/arrays/functions inline in JSX props passed to a memoized child — it breaks the memo. Hoist or `useMemo`/`useCallback`.
```tsx
  // ❌ new array + new fn every render → MemoChild always re-renders
  <MemoChild items={data.filter(x => x.active)} onPick={() => pick(id)} />
  // ✅
  const active = useMemo(() => data.filter(x => x.active), [data]);
  const onPick = useCallback(() => pick(id), [id]);
```
- `React.memo` only when a component (a) re-renders often, (b) usually with the same props, (c) is non-trivial to render. Don't blanket-wrap.
- Stable `key` on lists — never array index for dynamic/reorderable lists; use the entity `id` (`number`).
- Memoize Context value objects (`AuthContext`/`CartContext`) so a change in one field doesn't re-render every consumer.
- Large lists (> ~100 visible rows) → consider virtualization. Needs a lib (e.g. react-window) which is NOT installed — ASK before adding (core.md: no new deps without asking).

## Lazy-loading & bundle
- Route-level pages → `React.lazy` + `<Suspense fallback={<Skeleton />}>` so the initial bundle stays small. Wire in `router.tsx`.
```tsx
  const OrderHistoryPage = lazy(() => import('./features/order/OrderHistoryPage'));
```
- Heavy, rarely-used UI (modals, charts, editors) → dynamic `import()` on demand, not at module top.
- Import lodash per-method to keep tree-shaking: `import debounce from 'lodash/debounce'` — ❌ never `import _ from 'lodash'`.
- Don't pull a big dependency for something small/native; new deps need approval anyway.

## Data (TanStack Query)
- Caching + dedup is already handled (staleTime 60s in `lib/queryClient.ts`) — never hand-roll caching or refetch loops.
- Use `select` to narrow what a component subscribes to when it needs only part of the response.
- Paginated lists → `placeholderData: keepPreviousData` (v5) so the list doesn't flash empty between pages.
- Prefetch on intent (hover / route-enter) via `queryClient.prefetchQuery` — only for known-hot navigations.
- Keep `enabled` guards (data-fetching.md) so disabled queries don't fire wasted requests.

## Assets / layout
- `<img>` needs explicit `width` + `height` (or `aspect-ratio`) to avoid layout shift (CLS).
- Below-the-fold images → `loading="lazy"`.
- In hot paths, animate `transform`/`opacity`, not layout-affecting properties.

## When NOT to optimize
- One-off pages, small lists, cheap computation → write the clear version, skip memoization.
- Never add `useMemo`/`useCallback`/`React.memo` "just in case" — they cost comparison + memory and bloat the diff (conflicts with minimal-diff).
- If unsure whether something is hot, ship the simple correct version with a `// PERF:` note instead of speculative optimization.
