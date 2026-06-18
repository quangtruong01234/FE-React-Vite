# Core Rules — Always Loaded

These are the non-negotiable rules. Violating any of these breaks the build or the conventions. Full patterns and examples live in the other `context/` files — read them when your task touches that area.

## AI Agent Behavior

- **Never ask the user to paste logs, run commands, or check things manually** — read files and run commands yourself.
- **Never stop after one failed command** — try the alternative immediately.
- **Gather evidence first, then fix** — don't describe a problem and wait.
- **Minimal diff** — change only what's needed. No drive-by refactors.
- **Search before creating** — no duplicate hooks/components/utils. Use `/audit-duplicates`.
- **After every change:** run `npm run build` (includes `tsc --noEmit`). Never mark done with TS errors.
- **No new dependencies** without asking. `npm install` is blocked in `settings.json`.
- **UI lookup order (MANDATORY):** Before writing any new UI, check in this order: `src/components/ui/` → `src/components/shared/` → feature folder → only then create new. Never create a component that duplicates one already in `ui/` or `shared/`.
- **DRY — UI:** If the same UI pattern appears in 2+ places, stop and propose extracting it to `src/components/shared/` before continuing.
- **DRY — Logic:** If the same hook/util logic appears in 2+ feature folders, propose extracting it to `src/hooks/` or `src/lib/` before continuing.

## Stack (versions matter)

React 19 · Vite · TypeScript strict · React Router DOM **v7** · TanStack Query **v5** · Tailwind **v3** · shadcn/ui · Lodash.
`@tanstack/react-router` is installed but **UNUSED** — never import it.

## Data Fetching — hard rules

- GET → `useQuery()` · POST/PUT/DELETE → `useMutation()`
- ❌ NO `useState` + `useEffect` to fetch server data
- ❌ NO `fetch()` directly in components — use `api` from `src/api/index.ts`
- ❌ NO manual `loading`/`error` state for server data
- Mutations use `isPending`, not `isLoading` (v5)
- Query keys from `hooks/queryKeys.ts` factory — never inline `['products']`
- IDs are `number` everywhere — never `string`
- Details + examples → `.ai/context/data-fetching.md`

## Styling — hard rules

- Tailwind utility classes only. No inline `style={{}}` (sole exception: `Avatar.tsx`).
- No separate `.css`/`.module.css` (only `index.css`).
- No hardcoded hex (`[#...]`) and no raw palette (`text-gray-500`) — use `tb-*` tokens.
- Conditional classes via `cn()` from `lib/utils.ts` — not template literals.
- Tokens reference → `.ai/tokens.md` · styling guide → `.ai/context/styling.md`

## Auth — hard rules

- `credentials: 'include'` is global in `request()` — never add per-call.
- Auth state via `useAuthContext()` — never read `localStorage` in components.
- Never store raw JWT in localStorage. 401 → redirect `/login` via `useNavigate`.
- Details → `.ai/context/auth.md`

## TypeScript — hard rules

- Strict mode. No `any`. No `!` non-null assertion. No `@ts-ignore`.
- `catch (error: unknown)` then narrow.
- Explicit return types on non-trivial exported functions.
- **No snake_case** in FE-owned code (variables, props, function params, DTO fields). Exception: type fields that mirror a backend/external-API response verbatim (e.g. `created_at`, `public_id` from Cloudinary) — keep as-is to avoid transform overhead.

## Routing

- React Router DOM v7 only. Navigate via `<Link>` / `useNavigate` — never `window.location`.
- Routes: `/login`, `/`, `/product/:id`, `/checkout`, `/orders`. Details → `.ai/context/structure.md`.

## Performance
- Choose the better complexity/render approach up front (Map/Set lookups over nested find/filter; thin JSX; stable keys; memoize Context values) — but do NOT add memoization speculatively.
- Route-level pages lazy-load (`React.lazy` + `<Suspense>`); import lodash per-method (`lodash/debounce`), never the whole lib.
- Details + examples → `.ai/context/performance.md`

## Lodash — hard rules

- **Prefer lodash** over hand-rolled implementations for array/object/string utilities (e.g. `groupBy`, `orderBy`, `debounce`, `cloneDeep`, `pick`, `omit`).
- Exception: if lodash demonstrably causes a performance problem (profiled, not assumed), replace it with a native JS equivalent.
- Always import per-method: `import groupBy from 'lodash/groupBy'` — never `import _ from 'lodash'`.
