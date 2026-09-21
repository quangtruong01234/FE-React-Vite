# Working in this repo

This is the onboarding document for the TryBuy storefront — written for a person
joining the codebase, and read by the AI coding agents for the same reason. There
is one set of conventions, not a human set and a machine set.

Read this page, then `.ai/project.md`, then `.ai/context/core.md`. Everything else
is loaded on demand from the routing table below.

## What you are looking at

A React 19 + Vite SPA, TypeScript in strict mode, talking to a NestJS gateway in
the `BE-Microservice` repo. React Router v7 for routing, TanStack Query v5 for all
server state, Tailwind v3 with a custom `tb-*` token palette on a dark theme.
Package manager is **npm**. `npm run build` is `tsc --noEmit && vite build`, so the
build is the typecheck gate.

See [README.md](README.md) for the architecture diagram, the reasoning behind the
main decisions, and how to run it.

## The rules that actually bite

These are the ones that cause a broken build or a rejected review, not style
preferences. The full versions live in `.ai/context/core.md`.

**Styling.** Tailwind utility classes only — no inline `style={{}}` (the sole
exception is `Avatar.tsx`), no `.css` or `.module.css` files beyond `index.css`, no
hardcoded hex and no raw Tailwind palette (`text-gray-500`). Use the `tb-*` tokens
in `.ai/tokens.md`. Conditional classes go through `cn()` from `@/lib/format/utils`,
never a template literal. An icon-only button must be `<IconButton>`; a raw
`<button>` keeps UA padding that knocks the icon off-centre.

**Data fetching.** GET is `useQuery`, everything else is `useMutation`. Never
`useState` + `useEffect` to fetch server data, never `fetch()` in a component — use
the `api` object in `src/api/index.ts`. No hand-rolled `loading`/`error` state for
server data. Query keys come from the factory in `hooks/query/queryKeys.ts`, never
inline. Mutations use `isPending`, not `isLoading`.

**Public IDs.** Users, products, orders, addresses, notifications, return requests,
posts, comments, conversations and messages are opaque strings (`usr_`, `prod_`,
`ord_`, …). Pass them through unchanged; never `Number()` or `parseInt` them.
Catalog/SKU/cart-row/inventory-row/GHN IDs are still numeric.

**TypeScript.** Strict. No `any`, no `!` non-null assertion, no `@ts-ignore`.
`catch (error: unknown)` then narrow. No snake_case in code we own — the exception
is a type field mirroring a backend response verbatim.

**No native browser dialogs.** `window.confirm`/`alert`/`prompt` are banned in
`src/`. They ignore the design system, cannot show a pending or error state, and
are auto-suppressed by Playwright and Chrome DevTools, which makes any flow behind
one unverifiable. Use `ConfirmDialog` from `components/shared/`, or an existing
modal, or build one on `@/components/ui/dialog`.

**Before you create a component, go looking for it.** `src/components/ui/` →
`src/components/shared/` → the feature folder → only then write a new one.
`src/components/ui/` is generated shadcn code and is write-blocked. If the same UI
appears in two places, extract it to `shared/`; if the same hook or util appears in
two feature folders, extract it to `src/hooks/` or `src/lib/`.

**Every fix ships with a test.** Pull the logic into a pure function in `lib/` or
the feature folder and unit-test that, rather than leaving it inline and testing
through a render. `sku.ts`, `orderSummary.ts` and `sellerOrderActions.ts` are the
pattern. Keep `npm run test:run` green.

**No new dependencies without asking.** `npm install` is blocked in
`.claude/settings.json` on purpose.

## Where to read next

Load the matching file when your task touches that area — these are deliberately
not all loaded at once.

| Task touches | Read |
|---|---|
| Folder layout, file naming, routes | `.ai/context/structure.md` |
| Hooks, `useQuery`/`useMutation`, query keys | `.ai/context/data-fetching.md` |
| Tailwind classes, colours, layout bugs | `.ai/context/styling.md` + `.ai/tokens.md` |
| Login, logout, auth state, cookies, 401 | `.ai/context/auth.md` |
| Order status, returns, vouchers, payment, who sees what | `.ai/context/domain.md` |
| Forms, component structure, TS conventions, env vars | `.ai/context/conventions.md` |
| Calling an endpoint, the `api` object, `request()` | `.ai/api-reference.md` |
| Raw backend endpoints, query params, full field lists | `.ai/context/backend-api.md` |
| WebSocket, chat, notifications | `.ai/context/realtime.md` |
| Writing tests | `.ai/testing.md` |
| Render cost, list performance, memoization | `.ai/context/performance.md` |
| Something that looks right but does not work | `.ai/context/pitfalls.md` |
| Deploy, Cloudflare Workers, prod env vars, CORS | `DEPLOYMENT.md` |
| Codex filesystem, command, approval and MCP safety | `.ai/context/codex-safety.md` |

The repeatable procedures — review, add a test, scaffold a feature, commit, sweep
the backlog — are written once in `.ai/workflows/`, and the reviewer/debugger/
refactor-planner role definitions in `.ai/roles/`. Both tool adapters reference
those files rather than restating them.

## Cross-repo boundary

The workspace holds three repos: `api/` (backend), `frontend/` (this one) and
`web-flow-GHN/` (the shipping console). **Work here only.** Reading another repo to
prove where a bug lives is fine and often necessary; following that read with an
edit is not — the other repo has its own conventions, its own review and its own
deploy gate. Write the finding into the matching inbox under `../.agent-local/`
instead, including the non-bugs, so the next person does not re-derive them.

All three repos auto-deploy on merge to `main`, so shipping one side of a contract
change ahead of the other breaks production. Every push goes through
`../.agent-local/release-gate.md` first — classify the whole working tree, and do
not push while another repo's cell is unfinished.

## Why there are four AI directories

They are adapters, not four sets of rules:

| Directory | What it is |
|---|---|
| `.ai/` | **The rules.** Conventions, domain notes, pitfalls, testing guide, token tables — written for humans, read by both agents. The only place a convention is edited. |
| `.claude/` | Claude Code adapter: slash commands, subagent definitions, permission settings. Points at `.ai/`. |
| `.codex/` | Codex adapter: agent TOML and config. Points at `.ai/`. |
| `.agents/` | Tool-neutral skill definitions shared by both. |

The two tool directories have to sit at those exact paths — Claude Code and Codex
look for them by name — which is why they are not folded into `.ai/`. Nothing in
them restates a rule; if you find a rule duplicated into an adapter, that is the
bug. `.ai/README.md` maps the files individually.

## Expectations when working here

- Gather evidence before proposing a fix — read the files, run the commands.
- Minimal diff. No drive-by refactors bundled into an unrelated change.
- Search before creating; duplicates are the main way this codebase would rot.
- Run `npm run build` after every change. Nothing is done with a TS error open.
- When a backend contract turns out to be wrong or missing, record it in
  `../.agent-local/backend-handoff.md` rather than working around it silently.
