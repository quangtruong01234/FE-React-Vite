<!--
DESIGN DECISIONS — không thay đổi:
1. Ported from api/.claude/commands/sweep.md, adapted for FE: backlog sources are
   snapshot.md + ../.agent-local/frontend-handoff.md (BE→FE inbox), validation is
   build/lint/test:run. Runtime self-test uses BOTH tools, split by what they prove
   (revised 2026-09-25): Playwright e2e for behaviour/flow — repeatable, pass/fail,
   stays behind as a regression guard; Chrome DevTools MCP for visual/layout — the
   eye a spec does not have. A deep spec replaces the MCP flow walk, not the MCP
   visual check.
2. Three modes (fix / audit / propose) — keep parity with the backend /sweep so a
   weekly sweep can run on both repos with the same mental model.
3. Audit mode reuses the existing scan workflows as lenses (check-perf,
   check-tailwind, audit-duplicates) — do NOT duplicate their checklists here.
4. In-progress marker gives crash-safe resume: if a session dies mid-item, the
   next /sweep resumes at the recorded step instead of restarting the item
   (partial code stays in the working tree; tsc exposes the unfinished part).
-->

# /sweep — Weekly Backlog Sweep (Frontend)

Run the recurring audit → record → fix loop in one shot, without re-explaining
the workflow each time.

## How to invoke

```
/sweep            # fix the single highest-priority open item from the backlog
/sweep 3          # fix up to 3 open items in one autonomous batch
/sweep P2-05      # fix a specific item by id (snapshot or handoff id, e.g. F4)
/sweep audit      # audit-only: find NEW bugs/gaps/perf/styling issues, record to snapshot, DO NOT fix
/sweep propose    # propose new features, append to the Feature Roadmap in snapshot, DO NOT implement
```

---

## Backlog sources (read both, in this order)

1. `.ai/agent-handoff/snapshot.md` — sections "Active Tasks — open / blocked"
   (Chờ backend / Còn lại phía FE), "Perf — đo thật, phần còn mở", "Runtime
   verification còn nợ".
2. `../.agent-local/frontend-handoff.md` — **Open** entries (backend shipped,
   FE integration pending). Machine-local, outside the repo — never commit it.

## Mode: fix (default, `/sweep`, `/sweep N`, `/sweep <id>`)

1. Read both backlog sources and collect all open items.
2. Pick the top item by recorded priority (🔴 > 🟡 > 🟢; respect any
   "TOP FIX (next)" note). Handoff **Open** integration items rank above same-tier
   snapshot cleanups — they close a cross-repo thread. If the user passed an id,
   pick that one.
   - `E2E-DEBT` (routes with `deep: []`) is picked only when no 🔴/🟡 item is
     open; work it with the `/e2e fill` procedure in `.ai/workflows/e2e.md`
     (one route = one step of `/sweep N`), then shrink the item's route list.
   - An item already carrying an `⏳ in-progress:` marker from an earlier session
     outranks everything — resume it at the recorded step instead of restarting
     (its partial code is still in the working tree; `tsc --noEmit` exposes what
     is unfinished).
   - Before touching code, add a one-line marker next to the picked item in its
     backlog source: `⏳ in-progress: <item id> — <current step>`. Update the
     step note as you move (implement → test → runtime-verify) and remove the
     marker when the item closes in "Close the loop".
3. Load the matching `.ai/context/` files per the Context Map in `.ai/project.md`
   before touching code (styling task → `styling.md` + `tokens.md`, hook task →
   `data-fetching.md`, endpoint task → `api-reference.md`, …).
   Also look up every route the item touches in `e2e/routes.ts` — its roles and
   `deep` specs are what step 7a runs — and name those routes in the
   `⏳ in-progress` marker so a resumed session re-runs the same set.
   If the item is a **perf item** — or it adds a dependency, adds a lazy chunk, or
   touches a hot path — take the **before** numbers now, with the step 7c method,
   before touching code. A "before" measured after the change is not a baseline.
4. Implement with minimal diff, following all core rules: UI lookup order
   (`ui/` → `shared/` → feature → new), query keys from `hooks/query/queryKeys.ts`,
   `tb-*` tokens only, lodash per-method, no new dependencies.
5. **Every fix/logic change ships a test** — extract testable logic into a pure
   helper and colocate `*.test.ts(x)` (see `.ai/testing.md`).
   - If the item changes a **user flow** on a route (submit, state transition,
     retry, navigation across pages), also write or update that flow's deep spec
     `<flow>.<role>.spec.ts` per `.ai/workflows/e2e.md` § Writing a new spec, and
     list it in the route's `deep` array. A pure-logic or styling-only change needs
     the unit test plus the route's smoke — no new deep spec.
   - A new route gets its `e2e/routes.ts` row (`src/router.test.ts` fails without
     it) with `deep: []`, and is added to `E2E-DEBT`.
   - If the spec cannot be written (data or backend missing), say so and record the
     route as owed in `E2E-DEBT` — it does not block the item.
6. Validate — all must be green, zero errors:
   `npm run build` · `npm run check:bundle` · `npm run lint` · `npm run test:run`.
   `check:bundle` holds every emitted chunk to its gzip ceiling; CI runs it and a
   red one blocks the deploy, so it is part of the gate, not an extra.
7. Runtime-verify — three lenses, all on what step 3 recorded (7c only when it applies):
   - **7a · Behaviour (Playwright).** For each affected route, run its role's smoke
     and every spec in its `deep` array:
     `npx playwright test --project=<role> -g "<pattern> "` plus
     `npx playwright test e2e/<flow>.<role>.spec.ts`. Read `uptime` from
     `GET :3000/health` before and after; if it is shorter than the run, the gateway
     restarted mid-run and the result does not count — re-run with `--last-failed`.
     Count pass / fail / skip separately; a skip is "not exercised", never a pass.
   - **7b · Visual (Chrome DevTools MCP, the `/verify-ui` lens)** for items that
     change markup or styling: log in with an account from
     `../.agent-local/test-accounts.md` and check layout/alignment on the affected
     route. When the route has a deep spec, 7a already covers the flow — MCP only
     looks, it does not re-walk the flow.
   - **7c · Perf (Measure)** — for the items named in step 3. Take the "after"
     reading with the same method as "before":
     - **Bundle:** `npm run build && npm run check:bundle` — the chunk rows it prints.
     - **`/login` LCP / CLS:** `npx -y @lhci/cli@0.15.x autorun`. It uses the same
       budgets as CI and reads the median of 3 runs.
     - **Signed-in route LCP:** `npm run build && npm run preview`, then a Chrome
       DevTools MCP performance trace on `:4173`. **Never** the Vite dev server —
       it is unbundled and its numbers mean nothing.

     Both readings go in the CHANGELOG entry. With no "before", write "not
     measured" — never "improved".
   - If the backend (nodeA/nodeB) is not running, or MCP fails to connect, report
     that lens as **pending** instead of skipping silently. Neither blocks the
     item — e2e is not part of the gate.
8. Close the loop (Definition of Done):
   - Remove the item's `⏳ in-progress:` marker.
   - **Delete** the finished item from `snapshot.md` — do not leave a `~~struck~~
     RESOLVED` paragraph behind. Snapshot is the live picture only; a strikethrough
     trail is what grew it to 67 KB before the 2026-08-03 prune. Add one row to the
     "Recent closes" table instead (drop the oldest row when it passes 5).
   - Append the completed-work summary to `.ai/agent-handoff/CHANGELOG.md` — that is
     the only place finished work is written up in full. Include the 7a result per
     route (pass / fail / skip, or "pending — backend down") and any route left
     owed.
   - If the item came from `frontend-handoff.md`, move that entry to **Done**.
   - If a backend gap surfaced (missing data / wrong response / wrong request
     contract), append it to `../.agent-local/backend-handoff.md` per its template.
9. If `/sweep N`: repeat from step 2 until N items are done or a blocker is hit.
   Report progress per item; never leave the repo mid-item.
10. Final report: per item — what changed, files touched, test results, e2e per
    route (smoke + deep: pass / fail / skip, deep specs added, routes still owed),
    MCP visual result, perf before → after (when 7c applied),
    snapshot/CHANGELOG/handoff updates made.

## Mode: audit (`/sweep audit`)

1. Scope: default = full project. `/sweep audit <area>` (e.g. `order`, `chat`,
   `styling`) narrows it.
2. Hunt for NEW issues only — dedupe against `snapshot.md` before recording:
   - **Contract mismatches:** FE types vs. `.ai/context/backend-api.md` vs. actual
     runtime responses (wrong shape/type, string decimals, snake_case leaks).
   - **Data-fetching violations:** `useState`+`useEffect` fetching, direct
     `fetch()` in components, inline query keys, manual loading/error state,
     `isLoading` on mutations.
   - **Styling violations:** run the `/check-tailwind` checks.
   - **Perf anti-patterns:** run the `/check-perf` checks.
   - **Perf numbers (offline, no backend):** `npm run build && npm run check:bundle`,
     then `npx -y @lhci/cli@0.15.x autorun` for `/login`. Compare against the
     numbers recorded in snapshot §Perf. Two cases are a 🟡 finding:
     - a chunk grew > 10% since it was last recorded;
     - a chunk sits within 5% of its ceiling.

     Name the chunk in the finding. Then overwrite the numbers in §Perf, with the
     date, so the next audit has a baseline. This refresh is the one write this
     mode makes outside the findings.
   - **Duplicates:** run the `/audit-duplicates` checks on suspicious areas.
   - **A11y + UX gaps:** unnamed icon buttons, missing empty/error/loading states,
     `window.location` navigation.
   - **Runtime (backend up):** run the smoke layer only —
     `npx playwright test e2e/smoke` (every role; `setup` logs in first). Never
     `npm run test:e2e` here: deep specs write real data (e.g. `order-detail` cancels
     an order), which breaks this mode's read-only promise; they belong to fix
     step 7a. Smoke only issues GETs. Each route that fails on a stable
     gateway (uptime check as in fix step 7a) is a finding: 🔴 for an uncaught
     error / 5xx / wrong redirect, 🟡 for a `console.error` or a skipped `:id` route
     whose data should exist.
   - **Coverage:** run `/e2e coverage` and refresh the single `E2E-DEBT` 🟢 item
     (owed-route count + top 3 by risk). One aggregated item — never one per route.
3. Read-only — do not fix anything in this mode.
4. Record findings in `snapshot.md` using the existing convention
   (🔴/🟡/🟢 + `file:line` + one-line failure scenario + suggested fix), appended
   to the matching section.
5. Report: table of new findings + updated "TOP FIX (next)" recommendation.

## Mode: propose (`/sweep propose`)

1. Read `snapshot.md`, the **most recent ~10 entries** of
   `.ai/agent-handoff/CHANGELOG.md` (it is append-only and large — read the top of
   the file, never the whole thing), and `../.agent-local/frontend-handoff.md` to
   understand what already shipped and what backend capabilities are unused by FE.
2. Propose 3–5 net-new features ranked by value/effort, each with: one-line
   scope, affected routes/features, backend dependency yes/no (if yes, note it
   would need a `backend-handoff.md` request), test impact.
3. Do not implement. After the user picks, append the chosen items as `F<n>`
   entries to the Feature Roadmap section in `snapshot.md` (create the section
   if missing; reuse ids already taken by handoff items).

---

## Rules that always apply

- Never mark an item done with build/lint/test errors or a failed runtime check.
  A red smoke or deep spec on an affected route, with the gateway stable, is a
  failed runtime check — unless `e2e/README.md` maps that spec to a still-open bug
  that is not this item.
- For large items (many files/flows, or a contract/migration change), prefer
  `/sweep` (one item) over `/sweep N` — big batches bloat the conversation and
  force more context compactions mid-item.
- Minimal diff; no drive-by refactors of untouched code.
- No new dependencies without asking (`npm install` is blocked).
- Batch mode stops early on: ambiguous contract change, anything requiring a new
  dependency, or anything needing a user decision — report and continue with the
  next independent item.
- Handoff files (`frontend-handoff.md`, `backend-handoff.md`, `test-accounts.md`)
  live at the `MCR/` workspace root, outside the repo — never commit them.
