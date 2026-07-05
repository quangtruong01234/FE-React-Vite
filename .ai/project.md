# TryBuy Frontend — Shared Agent Guidance

Canonical guidance for Codex and Claude Code inside `frontend/`.

**TryBuy** — React 19 + Vite frontend for a microservices e-commerce platform.
Dark-theme design system using custom `tb-*` Tailwind tokens. Package manager: **npm**.

## Styling — Mandatory (always apply)

All styling = **Tailwind utility classes only**. Không có ngoại lệ nào trừ `Avatar.tsx`.

- ❌ No inline `style={{}}` — no `.css` / `.module.css` files
- ❌ No hardcoded hex — no raw Tailwind palette (`text-gray-500`, `bg-blue-600`)
- ✅ Conditional classes: `cn()` từ `@/lib/utils`
- ✅ Fonts: `font-display` / `font-body` / `font-mono` — không dùng `font-sans`

→ Token tables + full rules: load `.ai/context/styling.md` + `.ai/tokens.md`
khi task **viết hoặc chỉnh Tailwind classes** (không cần load cho task logic / API / data)

## Always-loaded rules

Read `.ai/context/core.md` before repository work.

## Context Map — read the relevant file when the task touches it

> These are NOT auto-loaded (to save context). Read the file when your task matches.

| When your task involves...                                                                  | Read                               |
| ------------------------------------------------------------------------------------------- | ---------------------------------- |
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

## Agents

| Agent              | When                               |
| ------------------ | ---------------------------------- |
| `code-reviewer`    | Deep multi-file review before PR   |
| `debugger`         | Persistent bug, >3 attempts failed |
| `refactor-planner` | Plan-only, no edits                |

## UI Patterns — Known Rules

### Icon Containers (MANDATORY)

Applies to **every** element that wraps a single Lucide icon — `<button>`, `<span>`, `<Link>`, or any tag:

- ❌ NEVER: `w-*` `h-*` + `flex items-center justify-center`
- ❌ NEVER: raw `<button>` for a sized icon button — use `<IconButton>` (see below)
- ✅ ALWAYS: `shrink-0` on **every** Lucide icon — in buttons, spans, links, dropdowns, everywhere
- ✅ ALWAYS: `size={n}` as **number**, never `size="n"` as string

#### `<IconButton>` — `src/components/shared/IconButton.tsx`

Use for **every** `<button>` that wraps a single icon. It auto-applies `p-0 grid place-items-center type="button"`, preventing UA padding from expanding the button past its `size-*` dimension.

```tsx
{/* sized circular — action buttons, back buttons */}
<IconButton className="size-8 rounded-full hover:bg-canvas-elevated text-ink-sec transition-colors shrink-0">
  <ChevronLeft size={18} className="shrink-0" />
</IconButton>

{/* sized square — form action buttons */}
<IconButton className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber/50 transition-colors">
  <RefreshCw size={15} className="shrink-0" />
</IconButton>
```

For padded nav buttons (Header, NotificationBell) that are NOT `size-*` based, use raw `<button>` with `p-* grid place-items-center`:

```tsx
{/* padded square — Header nav buttons */}
<button className="p-2.5 rounded-[10px] grid place-items-center">
  <Bell size={20} className="shrink-0" />
</button>
```

For `<span>` / `<Link>` icon containers (LeftRail, notification items) — no `p-0` needed, just `size-* grid place-items-center`.

- Reuse existing icon container patterns — do not invent new ones.

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

- Sized icon `<button>` uses `<IconButton className="size-* ...">` — never raw `<button>` with `p-0 grid`
- Padded nav `<button>` (Header) uses raw `<button className="p-* grid place-items-center">`
- `<span>` / `<Link>` icon containers use `size-* grid place-items-center` (no `p-0` needed)
- No `w-* h-* flex items-center justify-center` on any icon container (button, span, link)
- Every Lucide icon has `shrink-0` and uses `size={n}` (number, not string)
- Existing design-system tokens are used
- Existing component patterns were reused where applicable
- No unnecessary custom Tailwind combinations were introduced

## Quick Commands

```bash
npm run build   # tsc + vite build
npm run lint    # eslint
npm run dev     # dev server
```
