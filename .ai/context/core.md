# Core Rules — Always Loaded

These are the non-negotiable rules. Violating any of these breaks the build or the conventions. Full patterns and examples live in the other `context/` files — read them when your task touches that area.

## AI Agent Behavior

- **Never ask the user to paste logs, run commands, or check things manually** — read files and run commands yourself.
- **Never stop after one failed command** — try the alternative immediately.
- **Gather evidence first, then fix** — don't describe a problem and wait.
- **Minimal diff** — change only what's needed. No drive-by refactors.
- **Search before creating** — no duplicate hooks/components/utils. Use `/audit-duplicates`.
- **After every change:** run `npm run build` (includes `tsc --noEmit`). Never mark done with TS errors.
- **On task done — record backend gaps:** when finishing a task, evaluate whether you hit an API contract problem that only the backend can fix — **missing data** (a field/endpoint FE needs but BE doesn't return), a **wrong response** (shape/type/status/value vs. expected), or a **wrong/rejected request contract**. If so, append an entry to `../.agent-local/backend-handoff.md` (FE→BE inbox; use the template there). If FE shipped a client-side mitigation, note what would let FE drop it. Skip when it's purely a FE-side fix.
- **Every fix/logic change ships with a test.** A bug fix or new logic is not "done" until it has a colocated test (`*.test.ts`/`*.test.tsx`). Extract testable logic into a pure helper (`lib/` or feature folder) and unit-test it rather than leaving it inline in a component — see `sku.ts`/`orderSummary.ts`/`sellerOrderActions.ts`. Run `npm run test:run` and keep it green. Details → `.ai/testing.md`.
- **No new dependencies** without asking. `npm install` is blocked in `settings.json`.
- **UI lookup order (MANDATORY):** Before writing any new UI, check in this order: `src/components/ui/` → `src/components/shared/` → feature folder → only then create new. Never create a component that duplicates one already in `ui/` or `shared/`.
- **DRY — UI:** If the same UI pattern appears in 2+ places, stop and propose extracting it to `src/components/shared/` before continuing.
- **DRY — Logic:** If the same hook/util logic appears in 2+ feature folders, propose extracting it to `src/hooks/` or `src/lib/` before continuing.

## Cross-repo boundary — hard rule

The `MCR/` workspace holds three repos: `api/` (backend), `frontend/` (this one, the TryBuy storefront), and `web-flow-GHN/` (the GHN shipping console). **You only write code in `frontend/`.**

- **Never edit, create, or delete a file inside another repo** — not source, not tests, not docs, not its `.ai/`, `AGENTS.md`, or `handoff/CHANGELOG.md`. This holds even when the fix is obvious, one line, and you have just proven it on prod. That repo has its own agent, its own conventions, and its own release gate; a change you make there lands outside its review and outside its CD checks.
- **Reading another repo is fine** — and often necessary to prove where a bug actually lives. Read, then write the finding down. Do not follow the read with an edit.
- **Record the finding in the matching `../.agent-local/` inbox instead** (machine-local, outside every repo, never committed):

  | Bug lives in | Write to |
  |---|---|
  | `api/` (backend contract: missing data, wrong response, wrong request contract) | `../.agent-local/backend-handoff.md` |
  | `web-flow-GHN/` (GHN console UI/logic) | `../.agent-local/frontend-handoff-ghn.md` |
  | `frontend/` (this repo) | fix it here — no inbox needed |

- Note the **non-bugs** too, in the same entry: something you investigated and found to be by design, or a false alarm from a test-tool artifact. It stops the next agent re-deriving it.
- The **only** exception is an explicit, in-session instruction from the user to change that specific repo. Approval for one repo never carries to another, and never carries to the next session.

## Before pushing — read the release gate

Every push (any repo) goes through `../.agent-local/release-gate.md` — **read it before you push, every time**, including for changes that look small or obviously safe. All three repos auto-deploy on merge to `main`, so shipping one side of a contract change ahead of the other breaks prod for real users.

The gate owns the full procedure; the short version:

1. Open the gate and read **Holding** first — check whether this repo is locked by an entry.
2. Classify the **whole working tree** (not per file) as **A** (invisible to FE — push freely), **B** (additive, old FE still correct — push alone, log it), or **C** (old FE breaks, or new FE needs BE — **HOLD**). Mixed tree ⇒ take the highest class.
3. For a shared task, every repo cell in that entry must read `✅ ready`. One missing cell ⇒ do not push, even if your side is green.
4. **Report to the user using the gate's template and wait** — never push on your own initiative, and never assume the other side is done without a `✅` written in the gate.

After finishing this repo's part of a Holding entry, flip the `frontend` cell to `✅ ready`; if every cell is `✅`, move the entry to **Ready to release** and tell the user it is unlocked. If the contract turns out not to match what the handoff described, do **not** flip it — open a new entry in `backend-handoff.md`.

## Stack (versions matter)

React 19 · Vite · TypeScript strict · React Router DOM **v7** · TanStack Query **v5** · Tailwind **v3** · shadcn/ui · Lodash.
`@tanstack/react-router` is installed but **UNUSED** — never import it.

## Data Fetching — hard rules

- GET → `useQuery()` · POST/PUT/DELETE → `useMutation()`
- ❌ NO `useState` + `useEffect` to fetch server data
- ❌ NO `fetch()` directly in components — use `api` from `src/api/index.ts`
- ❌ NO manual `loading`/`error` state for server data
- Mutations use `isPending`, not `isLoading` (v5)
- Query keys from `hooks/query/queryKeys.ts` factory — never inline `['products']`
- Public IDs are opaque strings for users, products, orders, addresses, notifications, return requests, posts, comments, conversations, and messages (`usr_`, `prod_`, `ord_`, `addr_`, `ntf_`, `rr_`, `post_`, `cmt_`, `conv_`, `msg_`). Preserve them unchanged; never coerce them with `Number()`/`parseInt`. Unconverted catalog/SKU/cart-row/inventory-row/GHN IDs remain numeric.
- Details + examples → `.ai/context/data-fetching.md`

## Styling — hard rules

- Tailwind utility classes only. No inline `style={{}}` (sole exception: `Avatar.tsx`).
- No separate `.css`/`.module.css` (only `index.css`).
- No hardcoded hex (`[#...]`) and no raw palette (`text-gray-500`) — use `tb-*` tokens.
- Conditional classes via `cn()` from `lib/format/utils.ts` (`@/lib/format/utils`) — not template literals.
- **Icon buttons:** a sized icon-only `<button>` (`size-*`) MUST be `<IconButton>` (`components/shared/IconButton.tsx`), never a raw `<button>`. Raw `<button>` keeps UA default padding that nudges the box past `size-*` and knocks the icon off-center (the "icon lệch" bug). Every Lucide icon needs `shrink-0` + `size={n}` (number). Details → `.ai/context/styling.md`.
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
- Route table lives in `.ai/context/structure.md` (source of truth: `src/router.tsx`) — don't duplicate it here.

## Performance
- Choose the better complexity/render approach up front (Map/Set lookups over nested find/filter; thin JSX; stable keys; memoize Context values) — but do NOT add memoization speculatively.
- Route-level pages lazy-load (`React.lazy` + `<Suspense>`); import lodash per-method (`lodash/debounce`), never the whole lib.
- Details + examples → `.ai/context/performance.md`

## Lodash — hard rules

- **Prefer lodash** over hand-rolled implementations for array/object/string utilities (e.g. `groupBy`, `orderBy`, `debounce`, `cloneDeep`, `pick`, `omit`).
- Exception: if lodash demonstrably causes a performance problem (profiled, not assumed), replace it with a native JS equivalent.
- Always import per-method: `import groupBy from 'lodash/groupBy'` — never `import _ from 'lodash'`.
