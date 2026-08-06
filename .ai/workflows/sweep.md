<!--
DESIGN DECISIONS — không thay đổi:
1. Ported from api/.claude/commands/sweep.md, adapted for FE: backlog sources are
   snapshot.md + ../.agent-local/frontend-handoff.md (BE→FE inbox), validation is
   build/lint/test:run, self-test is Chrome DevTools MCP runtime verification.
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
4. Implement with minimal diff, following all core rules: UI lookup order
   (`ui/` → `shared/` → feature → new), query keys from `hooks/query/queryKeys.ts`,
   `tb-*` tokens only, lodash per-method, no new dependencies.
5. **Every fix/logic change ships a test** — extract testable logic into a pure
   helper and colocate `*.test.ts(x)` (see `.ai/testing.md`).
6. Validate — all three must be green, zero errors:
   `npm run build` · `npm run lint` · `npm run test:run`.
7. Runtime-verify UI-facing changes via Chrome DevTools MCP (the `/verify-ui`
   lens): log in with an account from `../.agent-local/test-accounts.md` and walk
   the affected flow. If the backend (nodeA/nodeB) is not running, report that
   runtime verification is pending instead of skipping silently.
8. Close the loop (Definition of Done):
   - Remove the item's `⏳ in-progress:` marker.
   - **Delete** the finished item from `snapshot.md` — do not leave a `~~struck~~
     RESOLVED` paragraph behind. Snapshot is the live picture only; a strikethrough
     trail is what grew it to 67 KB before the 2026-08-03 prune. Add one row to the
     "Recent closes" table instead (drop the oldest row when it passes 5).
   - Append the completed-work summary to `.ai/agent-handoff/CHANGELOG.md` — that is
     the only place finished work is written up in full.
   - If the item came from `frontend-handoff.md`, move that entry to **Done**.
   - If a backend gap surfaced (missing data / wrong response / wrong request
     contract), append it to `../.agent-local/backend-handoff.md` per its template.
9. If `/sweep N`: repeat from step 2 until N items are done or a blocker is hit.
   Report progress per item; never leave the repo mid-item.
10. Final report: per item — what changed, files touched, test + runtime results,
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
   - **Duplicates:** run the `/audit-duplicates` checks on suspicious areas.
   - **A11y + UX gaps:** unnamed icon buttons, missing empty/error/loading states,
     `window.location` navigation.
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
