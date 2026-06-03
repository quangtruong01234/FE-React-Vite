# CLAUDE.md — Frontend

Guidance for Claude Code inside `frontend/`.

**TryBuy** — React 19 + Vite frontend for a microservices e-commerce platform.
Dark-theme design system using custom `tb-*` Tailwind tokens. Package manager: **npm**.

## Styling — Mandatory (always apply)

All styling = **Tailwind utility classes only**. Không có ngoại lệ nào trừ `Avatar.tsx`.

- ❌ No inline `style={{}}` — no `.css` / `.module.css` files
- ❌ No hardcoded hex — no raw Tailwind palette (`text-gray-500`, `bg-blue-600`)
- ✅ Conditional classes: `cn()` từ `@/lib/utils`
- ✅ Fonts: `font-display` / `font-body` / `font-mono` — không dùng `font-sans`

→ Token tables + full rules: load `context/styling.md` + `tokens.md`
  khi task **viết hoặc chỉnh Tailwind classes** (không cần load cho task logic / API / data)

## Always-loaded rules

@context/core.md

## Context Map — read the relevant file when the task touches it

> These are NOT auto-loaded (to save context). Read the file when your task matches.

| When your task involves...                                                                  | Read                               |
| ------------------------------------------------------------------------------------------- | ---------------------------------- |
| Folder layout, file naming, where to put a new file, routes                                 | `context/structure.md`             |
| Writing/editing hooks, `useQuery`/`useMutation`, query keys                                 | `context/data-fetching.md`         |
| Viết hoặc chỉnh Tailwind classes, chọn màu / token, fix layout / UI bug                    | `context/styling.md` + `tokens.md` |
| Login, logout, auth state, cookies, 401 handling                                            | `context/auth.md`                  |
| Forms, component structure, lodash, TS rules, env vars                                      | `context/conventions.md`           |
| Calling an API endpoint, `api` object, `request()` contract                                 | `api-reference.md`                 |
| Raw backend endpoint details, query params, all fields                                      | `context/backend-api.md`           |
| WebSocket / chat / notifications / socket.io                                                | `context/realtime.md`              |
| Writing tests                                                                               | `testing.md`                       |
| Adding/editing components, hooks, lists, or hot-path render/compute — keeping the UI smooth | `context/performance.md`           |

## Slash Commands

| Command             | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `/review`           | Code review against FE standards (11 layers + verdict) |
| `/check-tailwind`   | Scan Tailwind/CSS violations (6 checks)                |
| `/fix-typescript`   | Run tsc, fix errors in loop                            |
| `/scaffold-feature` | Bootstrap a feature folder per convention              |
| `/audit-duplicates` | Find duplicate hooks/components before creating        |
| `/debug`            | Error triage workflow                                  |
| `/commit`           | Conventional commit from staged diff                   |
| `/research`         | Read-only investigation                                |
| `/add-test`         | Generate Vitest + RTL test                             |
| `/check-perf`       | Scan static performance anti-patterns (report-only)    |

## Agents

| Agent              | When                               |
| ------------------ | ---------------------------------- |
| `code-reviewer`    | Deep multi-file review before PR   |
| `debugger`         | Persistent bug, >3 attempts failed |
| `refactor-planner` | Plan-only, no edits                |

## UI Patterns — Known Rules

- **Icon button tròn**: dùng `size-{n} grid place-items-center` (không dùng `w-{n} h-{n} flex items-center justify-center`). Thêm `shrink-0` trên icon bên trong để tránh SVG bị ép nhỏ.

## Quick Commands

```bash
npm run build   # tsc + vite build
npm run lint    # eslint
npm run dev     # dev server
```
