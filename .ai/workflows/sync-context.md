# /sync-context — Doc ↔ Code Drift Scan

Verify that everything `.ai/` **asserts about the codebase** is still true. Report only — never
auto-edit a doc without showing the evidence first.

> Why this exists: batch A of the 2026-08 audit found 9 places where docs told an agent to do
> something the code contradicted, and batch B found 28 stale paths. That was all hand work. It
> will drift again — this command is that work, repeatable.

## How to invoke

```
/sync-context            # full scan
/sync-context paths      # only the path check (fast)
/sync-context <file>     # only assertions made by one doc
```

## Scope

**Scan:** `.ai/context/`, `.ai/workflows/`, `.ai/roles/`, `.ai/testing.md`,
`.ai/api-reference.md`, `.ai/project.md`, `.ai/tokens.md`, `.ai/README.md`,
`.claude/CLAUDE.md`.

**Do NOT flag drift in:** `.ai/agent-handoff/CHANGELOG.md`, `CHANGELOG.archive.md`. These are
**historical records** — a path that was correct in June and is gone today is right, not stale.
Deleting it would destroy the record. `snapshot.md` is a middle case: it describes the *present*,
so its claims ARE in scope, but it is expected to churn.

---

## Check 1 — Paths that no longer exist 🔴

Every `` `src/...` `` cited in a guidance doc must resolve on disk.

```bash
grep -rhoE '`(src/[A-Za-z0-9_./@-]+)`' .ai/ --include=*.md \
  | tr -d '`' | sed 's/:.*//' | sort -u > /tmp/paths.txt
while read -r p; do [ -e "$p" ] || echo "DEAD: $p"; done < /tmp/paths.txt
```

For each dead path, find the citing doc and the real location before proposing a fix:

```bash
grep -rln "<dead-path>" .ai/ --include=*.md | grep -v CHANGELOG
find src -name "$(basename <dead-path>)"
```

Two different failures, two different fixes — **decide which before editing**:
- **Moved** (`lib/utils.ts` → `lib/format/utils.ts`) → update the path.
- **Deleted** (`ApiErrorContext.tsx`) → delete the passage. Don't repoint it at a lookalike.

## Check 2 — Symbols that no longer exist 🔴

Components and functions named in guidance must exist in `src/`.

```bash
# PascalCase (components, types, contexts)
grep -rhoE '`<?[A-Z][A-Za-z0-9]{3,}>?`' .ai/context/ .ai/workflows/ .ai/roles/ \
  .ai/testing.md .ai/api-reference.md .ai/project.md .ai/tokens.md --include=*.md \
  | tr -d '`<>/' | sort -u > /tmp/ids.txt
while read -r id; do grep -rqE "\b$id\b" src/ || echo "MISSING: $id"; done < /tmp/ids.txt

# camelCase called as a function
grep -rhoE '`[a-z][A-Za-z0-9]{4,}\(' .ai/context/ .ai/workflows/ .ai/roles/ \
  .ai/testing.md .ai/api-reference.md .ai/project.md --include=*.md \
  | tr -d '`(' | sort -u > /tmp/fns.txt
while read -r f; do grep -rqE "\b$f\b" src/ || echo "MISSING: $f"; done < /tmp/fns.txt
```

**Expect false positives** and triage them by hand — the PascalCase pattern also catches prose
(`Path`, `STUCK`), TS error codes (`TS2345`), and backend-side concepts (`ResponseInterceptor`).
Only a name that is *supposed* to be FE code is a finding.

## Check 3 — Route table vs `router.tsx` 🔴

`.ai/context/structure.md` claims to mirror `src/router.tsx`.

```bash
grep -oE "path: '[^']*'" src/router.tsx | sed "s/path: //" | tr -d "'" | sort -u
grep -nE "^\|.*\`/" .ai/context/structure.md
```

Compare both directions: a route in code but not the table (agent won't know it exists) **and** a
route in the table but not code (agent links to a 404). Also check `requiredRole` per route — a
wrong role claim in the doc is worse than a missing row.

## Check 4 — Commands the docs promise 🟠

```bash
ls .ai/workflows/ .claude/commands/
grep -nE '^\| `/' .ai/project.md
```

Three sets must agree: the table in `.ai/project.md`, `.ai/workflows/*.md` (canonical body), and
`.claude/commands/*.md` (thin `@`-import adapter). Same for the agent table vs `.ai/roles/` +
`.claude/agents/`.

## Check 5 — Commands the docs tell you to RUN 🔴

**This is the check that found the biggest bug of the 2026-08 audit.** Docs said
"`npm run build` (includes `tsc --noEmit`)" while the script was bare `vite build` — so three type
errors lived in the tree for two weeks and every "gates green" line in the CHANGELOG was
overstated.

```bash
grep -rhoE 'npm run [a-z:0-9]+' .ai/ .claude/CLAUDE.md --include=*.md | sort -u
node -e "console.log(JSON.stringify(require('./package.json').scripts,null,2))"
```

Verify **two** things, not one:
1. Every cited script **exists**.
2. Every claim about what a script *does* matches its actual definition. Read the script body.
   Never infer a script's behaviour from a doc — that is the exact loop this check breaks.

## Check 6 — Stale examples 🟠

Grep-proof, so it needs judgement. Read code blocks in `.ai/context/*.md` and confirm the pattern
is still current:
- `useQuery`/`useMutation` shape matches TanStack Query **v5** (`isPending`, not `isLoading`).
- Query keys come from the `hooks/query/queryKeys.ts` factory, never inline.
- IDs in examples are opaque strings (`prod_abc`), not numbers — the PUBID migration is done.
- Imports use the real alias depth (`@/lib/format/utils`, not `@/lib/utils`).

## Check 7 — Always-loaded budget 🟡

The three always-loaded files cost context on **every** session.

```bash
wc -c .claude/CLAUDE.md .ai/project.md .ai/context/core.md
```

Baseline **12.627 B ≈ 3,5k token** (2026-08-04, end of the `.ai/` audit). Report the delta. Growth past ~15 kB means
something belongs in an on-demand `context/` file instead — moving it is a proposal, not an
automatic edit.

---

## Output

Group findings by check, most severe first. For each:

```
🔴 <doc>:<line> — <what it asserts> → <what the code actually says>
   Evidence: <file:line in src/ or the command output>
   Fix: <update path | delete passage | fix the code instead>
```

End with a one-line verdict: **CLEAN** or **N findings (X red / Y orange)**.

**"Fix the code instead" is a real option.** When a doc's intent is right and the code drifted away
from it, change the code — that is how the `build`-typecheck gap was closed. Decide which side is
wrong before editing either.

Never bulk-rewrite docs to make this command pass. A finding is a question about which side is
correct; answer it with evidence.
