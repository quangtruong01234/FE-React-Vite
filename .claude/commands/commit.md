# /commit — Generate Conventional Commit

Inspect staged diff, generate a Conventional Commit message. Default mode shows message for review. Auto-commit is available via `--auto`.

## How to invoke

```
/commit              # inspect staged, show message for review
/commit --all        # stage all tracked changes first, then show for review
/commit --auto       # staged only, commit automatically
/commit --all --auto # stage all + commit automatically
```

---

## Protocol

### Step 1 — Inspect

```bash
git status
git diff --cached --stat
git diff --cached
```

If nothing staged → report `[NOTHING STAGED] Use git add first.` and stop.

### Step 2 — Classify

Pick ONE type:

| Type | Use when |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace, no logic change |
| `docs` | Documentation only |
| `test` | Add or update tests |
| `build` | Build system, deps, config |
| `chore` | Routine tasks, no src/ impact |
| `revert` | Reverting a previous commit |

### Step 3 — Determine scope (optional but preferred)

From the file paths in the diff:
- Changes only in `src/features/auth/` → scope: `auth`
- Changes only in `src/features/cart/` → scope: `cart`
- Changes in `src/api/` → scope: `api`
- Changes in `.claude/` (commands, settings, any config) → scope: `claude`
- Changes across multiple features → no scope, or pick the dominant one

### Step 4 — Write the message

Format:
```
<type>(<scope>): <subject>

<body — optional, 72 char wrap, explains WHY not WHAT>

<footer — optional, e.g. BREAKING CHANGE: ..., Refs: TB-123>
```

Subject rules:
- ≤ 72 chars
- Imperative mood ("add", "fix", "remove" — not "added", "fixes")
- No trailing period
- Lowercase first letter (after `<type>(<scope>):`)

Body rules:
- Only if change is non-obvious or breaks something
- Skip if the subject is self-explanatory

### Step 5 — Output

Present the message in a copy-paste block:

````
── Proposed Commit ──────────────────────────────
Files changed: 3
  M src/features/auth/LoginPage.tsx
  M src/features/auth/useLogin.ts
  M src/context/AuthContext.tsx

```
feat(auth): persist user identity in localStorage after login

Temporary workaround — backend GET /user/me has shipped but the
FE migration is pending (see context/auth.md FOLLOW-UP). Stores
{ id, username, email } from the login response so the app shows
the current user across reloads.
```

To commit:
  git commit -m "<paste subject>" -m "<paste body>"

Or open editor:
  git commit
─────────────────────────────────────────────────
````

### Step 5.5 — Auto-commit (only if `--auto` flag is present)

Run:
```bash
git add -A   # only if --all was also passed
git commit -m "<subject>" -m "<body>"
```

Then confirm:
```
[AUTO-COMMITTED] <type>(<scope>): <subject>
Commit hash: <git rev-parse --short HEAD>
```

### Step 6 — Self-check

Before presenting, verify:
- [ ] Subject ≤ 72 chars
- [ ] Type is from the allowed list
- [ ] Scope (if any) matches actual files changed
- [ ] No `console.log` or `// TODO without ticket` was added (warn user if present)
- [ ] No secrets / `.env` content in the diff (REFUSE TO PROCEED if found)

---

**Model:** Sonnet 4.6 | **Effort:** Low
