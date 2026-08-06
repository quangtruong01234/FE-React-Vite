# TryBuy Frontend — Shared Agent Guidance

Canonical guidance for Codex and Claude Code inside `frontend/`.

**TryBuy** — React 19 + Vite frontend for a microservices e-commerce platform.
Dark-theme design system using custom `tb-*` Tailwind tokens. Package manager: **npm**.

## Styling — Mandatory (always apply)

All styling = **Tailwind utility classes only**. Không có ngoại lệ nào trừ `Avatar.tsx`.

- ❌ No inline `style={{}}` — no `.css` / `.module.css` files
- ❌ No hardcoded hex — no raw Tailwind palette (`text-gray-500`, `bg-blue-600`)
- ✅ Conditional classes: `cn()` từ `@/lib/format/utils`
- ✅ Fonts: `font-display` / `font-body` / `font-mono` — không dùng `font-sans`

→ Token tables + full rules: load `.ai/context/styling.md` + `.ai/tokens.md`
khi task **viết hoặc chỉnh Tailwind classes** (không cần load cho task logic / API / data)

## Always-loaded rules

Read `.ai/context/core.md` before repository work.

## Context Map — read the relevant file when the task touches it

> These are NOT auto-loaded (to save context). Read the file when your task matches.

| When your task involves...                                                                  | Read                               |
| ------------------------------------------------------------------------------------------- | ---------------------------------- |
| Order status/transition, trả hàng-hoàn tiền, voucher, thanh toán/idempotency, role nào thấy gì | `.ai/context/domain.md`            |
| Debug một thứ "trông đúng mà không chạy" — filter không ăn, alpha không lên, id rơi fallback | `.ai/context/pitfalls.md`          |
| Folder layout, file naming, where to put a new file, routes                                 | `.ai/context/structure.md`             |
| Writing/editing hooks, `useQuery`/`useMutation`, query keys                                 | `.ai/context/data-fetching.md`         |
| Viết hoặc chỉnh Tailwind classes, chọn màu / token, fix layout / UI bug                     | `.ai/context/styling.md` + `.ai/tokens.md` |
| Login, logout, auth state, cookies, 401 handling                                            | `.ai/context/auth.md`                  |
| Forms, component structure, lodash, TS rules, env vars                                      | `.ai/context/conventions.md`           |
| Calling an API endpoint, `api` object, `request()` contract                                 | `.ai/api-reference.md`                 |
| Raw backend endpoint details, query params, all fields                                      | `.ai/context/backend-api.md`           |
| WebSocket / chat / notifications / socket.io                                                | `.ai/context/realtime.md`              |
| Writing tests                                                                               | `.ai/testing.md`                       |
| Adding/editing components, hooks, lists, or hot-path render/compute — keeping the UI smooth | `.ai/context/performance.md`           |
| Running Chrome DevTools MCP (`/verify-ui`), logging in to test the UI                      | `../.agent-local/test-accounts.md`   |
| Deploy / CI-CD, Cloudflare Workers, env vars ở production, CORS + cookie cross-origin      | `DEPLOYMENT.md` (repo root)        |

## Slash Commands

| Command             | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `/review`           | Code review against FE standards (11 layers + verdict)                   |
| `/check-tailwind`   | Scan Tailwind/CSS violations (7 checks)                                  |
| `/fix-typescript`   | Run tsc, fix errors in loop                                              |
| `/scaffold-feature` | Bootstrap a feature folder per convention                                |
| `/audit-duplicates` | Find duplicate hooks/components before creating                          |
| `/debug`            | Error triage workflow                                                    |
| `/commit`           | Conventional commit from staged diff                                     |
| `/research`         | Read-only investigation                                                  |
| `/add-test`         | Generate Vitest + RTL test                                               |
| `/check-perf`       | Scan static performance anti-patterns (report-only)                      |
| `/sweep`            | Weekly backlog sweep — fix top item(s) from snapshot + handoff inbox (`/sweep`, `/sweep 3`), audit-only (`/sweep audit`), or propose features (`/sweep propose`) |
| `/verify-ui`        | Verify UI render via Chrome DevTools MCP (alignment/layout, report-only) |
| `/sync-context`     | Scan `.ai/` for doc↔code drift — dead paths/symbols, stale route table, script claims (report-only) |
| `/e2e`              | Run or write a Playwright spec (needs live backend + user-installed browser) |

## Agents

| Agent              | When                               |
| ------------------ | ---------------------------------- |
| `code-reviewer`    | Deep multi-file review before PR   |
| `debugger`         | Persistent bug, >3 attempts failed |
| `refactor-planner` | Plan-only, no edits                |

## UI Patterns

Icon containers (`IconButton` vs padded nav `<button>` vs `<span>`/`<Link>`), the icon-container
decision table, and the pre-close Tailwind self-review checklist all live in
**`.ai/context/styling.md`** — load it whenever the task touches UI markup.

The UI lookup order (`ui/` → `shared/` → feature folder → create new) and the DRY thresholds
are hard rules in `.ai/context/core.md`. `src/components/ui/` is **write-blocked** — never edit it.

## Quick Commands

```bash
npm run build   # tsc + vite build
npm run lint    # eslint
npm run dev     # dev server
```
