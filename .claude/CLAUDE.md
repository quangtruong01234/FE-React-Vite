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
| Viết hoặc chỉnh Tailwind classes, chọn màu / token, fix layout / UI bug                     | `context/styling.md` + `tokens.md` |
| Login, logout, auth state, cookies, 401 handling                                            | `context/auth.md`                  |
| Forms, component structure, lodash, TS rules, env vars                                      | `context/conventions.md`           |
| Calling an API endpoint, `api` object, `request()` contract                                 | `api-reference.md`                 |
| Raw backend endpoint details, query params, all fields                                      | `context/backend-api.md`           |
| WebSocket / chat / notifications / socket.io                                                | `context/realtime.md`              |
| Writing tests                                                                               | `testing.md`                       |
| Adding/editing components, hooks, lists, or hot-path render/compute — keeping the UI smooth | `context/performance.md`           |
| Running Chrome DevTools MCP (`/verify-ui`), logging in to test the UI                      | `test-accounts.md`                 |

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
| `/verify-ui`        | Verify UI render via Chrome DevTools MCP (alignment/layout, report-only) |

## Agents

| Agent              | When                               |
| ------------------ | ---------------------------------- |
| `code-reviewer`    | Deep multi-file review before PR   |
| `debugger`         | Persistent bug, >3 attempts failed |
| `refactor-planner` | Plan-only, no edits                |

## UI Patterns — Known Rules

### Icon Buttons (MANDATORY)

For circular icon buttons:

- ❌ NEVER use: `w-*` `h-*` + `flex items-center justify-center`
- ✅ ALWAYS use: `size-*` + `grid place-items-center`

```tsx
<button className="size-8 grid place-items-center rounded-full">
  <X size={16} className="shrink-0" />
</button>
```

Additional requirements:

- Always add `shrink-0` to Lucide icons inside icon-only buttons.
- Reuse existing icon button patterns found in the codebase.
- Do not invent new icon button implementations when a similar component already exists.

### Existing UI Pattern Reuse (MANDATORY)

Before creating or modifying UI, follow this lookup order — stop at the first match:

1. **`src/components/ui/`** — shadcn primitives (Button, Dialog, Skeleton, …). Customize these files directly to fit the design system.
2. **`src/components/shared/`** — project-level shared components (Avatar, GradientButton, …).
3. **Feature folder** — component local to that feature.
4. **Create new** — only if nothing above fits.

Additional rules:

- Follow existing spacing, sizing, radius, and alignment patterns from the matched component.
- When multiple patterns exist, choose the most recently used shared pattern.
- **If the same UI pattern appears in 2+ places:** stop, propose extracting it to `src/components/shared/` before continuing.
- **If the same hook/util logic appears in 2+ feature folders:** stop, propose extracting it to `src/hooks/` or `src/lib/` before continuing.

### Tailwind Self-Review

Before completing any UI task, verify:

- Icon buttons use `size-* grid place-items-center`
- No `w-* h-* flex items-center justify-center` icon button pattern exists
- Existing design-system tokens are used
- Existing component patterns were reused where applicable
- No unnecessary custom Tailwind combinations were introduced

## Quick Commands

```bash
npm run build   # tsc + vite build
npm run lint    # eslint
npm run dev     # dev server
```
