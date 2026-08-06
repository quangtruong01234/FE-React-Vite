<!--
DESIGN DECISIONS — không thay đổi:
1. Layer order (TypeScript → Styling → shadcn → TanStack → API → Auth → Routing → Performance → A11y → General)
   Lý do: scan theo dependency order, lỗi layer trên ảnh hưởng layer dưới
2. Mỗi layer là section riêng — KHÔNG merge thành flat list, KHÔNG duplicate sections
3. Kết thúc bằng verdict block cố định (LGTM / MINOR / NEEDS CHANGES)
   Lý do: dễ parse khi pipe vào commit/PR tool
-->

# /review — Frontend Code Review

## How to invoke

```
/review                    # reviews all uncommitted changes (git diff)
/review <file-or-folder>   # reviews a specific path
```

---

## Review Checklist

### 1. TypeScript
- [ ] No `any` types — use `unknown` + narrowing
- [ ] No `!` non-null assertions
- [ ] Explicit return types on non-trivial exported functions
- [ ] `npm run build` passes (includes `tsc --noEmit`) with zero errors
- [ ] Catch blocks use `catch (error: unknown)` then narrow

### 2. Styling
- [ ] No `style={{}}` inline style props (exception: `Avatar.tsx` CSS custom properties)
- [ ] No separate `.css` or `.module.css` files (only `index.css` allowed)
- [ ] No direct `.css` imports in components (except `main.tsx` → `index.css`)
- [ ] No hardcoded hex colors — use semantic aliases (`canvas-*`, `ink-*`, `accent-*`, `bdr`) or `tb-*` tokens; see `.ai/tokens.md` "Which System to Use"
- [ ] No raw Tailwind palette (`text-gray-500`, `bg-blue-600`) — use tokens; note `accent-cyan` and `accent-green` have **no `tb-*` equivalent** (semantic aliases only — not violations)
- [ ] Conditional classes use `cn()` from `lib/format/utils.ts` — not string concat or template literals
- [ ] Fonts use `font-display` / `font-body` / `font-mono` — not bare `font-sans`
- [ ] Border-radius uses `rounded-tb-*` tokens (only system for radius — no semantic alias equivalents)

### 3. shadcn/ui
- [ ] Components imported from `@/components/ui/<name>` — never from Radix directly
- [ ] No edits to files inside `src/components/ui/` — install via `npx shadcn add`
- [ ] Composition via wrapper components in `components/shared/`, not by editing primitives

### 4. TanStack Query
- [ ] All server state via `useQuery` / `useMutation` — no inline `fetch()` in components
- [ ] No `useState` + `useEffect` to fetch server data
- [ ] Mutations use `isPending`, not `isLoading` (v5 syntax)
- [ ] Query keys from `hooks/query/queryKeys.ts` factory — not inline string arrays
- [ ] Converted public IDs (`usr_`, `prod_`, `ord_`, `addr_`, `ntf_`, `rr_`, `post_`, `cmt_`, `conv_`, `msg_`) stay opaque `string` — never `Number()`/`parseInt`. Only unconverted catalog/SKU/cart-row/inventory-row/GHN IDs are `number`
- [ ] `enabled` guard used when query depends on async/derived value (e.g. `useParams`)
- [ ] `onSuccess` invalidates relevant queries after mutation
- [ ] Errors handled — `error` for queries, `onError` for mutations (never silent)

### 5. API Layer
- [ ] All HTTP calls go through `api` object from `api/index.ts`
- [ ] No inline `fetch()` outside `api/index.ts`
- [ ] No `axios` or other HTTP clients
- [ ] No per-call `credentials: 'include'` — it's global in `request()`
- [ ] New endpoints registered in `api` object + types in `types/index.ts`

### 6. Auth
- [ ] No raw JWT in `localStorage` / `sessionStorage` / `Authorization` header
- [ ] Auth state via `useAuthContext()` — never `localStorage.getItem('user')` in components
- [ ] 401 redirects to `/login` (not `/auth/login`), via `useNavigate` not `window.location`
- [ ] No user object in localStorage — auth state lives in the `queryKeys.auth.me` query cache only (`src/hooks/auth/useAuth.ts`)

### 7. Routing
- [ ] Navigation via `<Link>` / `useNavigate` — no `window.location.href = ...`
- [ ] No view-state flags replacing `<Route>` (e.g. `if (page === 'cart')`)
- [ ] Routes registered in `router.tsx` and mirrored in the `.ai/context/structure.md` route table
- [ ] No imports from `@tanstack/react-router` — use `react-router-dom`
- [ ] Public-ID route params passed through as `string` with a presence/format guard (`enabled: Boolean(id)`) — never `Number(id)` / `parseInt(id!)`

### 8. Performance
> Rule source: .ai/context/performance.md
- [ ] Heavy computation in render wrapped in `useMemo` (only where measurable)
- [ ] Callbacks passed to memoized children wrapped in `useCallback`
- [ ] Large lists (> ~100 items) consider virtualization
- [ ] Images have explicit `width` + `height` to prevent CLS
- [ ] No new arrays/objects in JSX props if child is memoized
- [ ] Page-level routes can be `React.lazy` + `<Suspense>` if bundle size grows

### 9. Accessibility
- [ ] Interactive elements have visible text or `aria-label`
- [ ] Semantic HTML (`button`, `nav`, `main`, `section`) before reaching for `div`
- [ ] Forms have associated `<label>` for inputs
- [ ] Keyboard navigation works — no `onClick` on `div` without `role` + `tabIndex` + `onKeyDown`
- [ ] Color contrast meets WCAG AA (dark theme makes this easier to miss)

### 10. General
- [ ] Business logic in hooks, not inline JSX
- [ ] Loading states use `<Skeleton />`, not spinners or empty renders
- [ ] Error states handled explicitly — not silently ignored
- [ ] No `console.log` in committed code (`console.error` for genuine error reporting is OK)
- [ ] `formatPrice()` from `lib/format/utils.ts` used for all price display — not inline `toLocaleString`
- [ ] No TODO comments without a ticket reference or owner

### 11. WebSocket
- [ ] Socket connection lives in a dedicated hook/module (`features/chat/useChat.ts`, `features/chat/chatPresenceSocket.ts`, `features/notifications/notificationSocket.ts`) — never inline in a component
- [ ] `useEffect` connects and cleanup always calls `socket.disconnect()` — no orphaned connections, StrictMode-safe
- [ ] `withCredentials: true` on every `io()` call — never pass JWT via `handshake.auth.token` / `handshake.query.token` in committed code
- [ ] Socket payloads write to their **own** query key (`messages.byConversation`, `conversations.all`, notification count) — never hijack an unrelated key like `auth.me`. Live in-session append may also use `useState`; `mergeMessages` dedupes the overlap (realtime.md)
- [ ] Connection options come from `SOCKET_CONNECT_OPTIONS` (`lib/realtime/socket.ts`) — never inlined
- [ ] `error` event always handled (at minimum `console.error`) — never silently swallowed
- [ ] No socket instance stored outside a `useRef` / `useEffect` closure (module-level singletons only for the documented ref-counted app-scoped sockets)

### 12. Testing
> Rule source: .ai/testing.md · core.md "Every fix/logic change ships with a test"
- [ ] Every bug fix / new logic has a colocated `*.test.ts(x)` next to the code it covers
- [ ] Non-trivial logic extracted into a pure helper (`lib/<layer>/` or the feature folder) and unit-tested — not left inline in a component
- [ ] `npm run test:run` is green
- [ ] Component tests use `renderWithProviders` (`src/test/`) — no hand-rolled provider wrappers. `renderHook` tests may build a local wrapper (fresh `QueryClient`, `retry: false`)
- [ ] API stubbed with MSW `server.use(...)` — no raw `fetch` mocks, no `vi.mock('@/api')`

---

## Output Format

For each issue found:

```
🔴 [layer]  <file>:<line>
  Problem: <what is wrong>
  Fix:     <suggested correction>
```

Severity:
- 🔴 RED — blocker, must fix
- 🟡 YELLOW — warning, can merge with follow-up
- ℹ️  INFO — suggestion, not required

## Verdict (always include at end)

```
── Review Summary ──────────────────────────────
  Files reviewed : N
  🔴 Red issues  : X
  🟡 Yellow      : Y
  ℹ️  Info       : Z
────────────────────────────────────────────────
Verdict: <one of>
  ✅ LGTM            — no issues
  ⚠️  MINOR          — yellow only, merge with follow-up
  ❌ NEEDS CHANGES   — red issues present, must fix
```
