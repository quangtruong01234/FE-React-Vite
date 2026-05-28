# /commit — Generate Conventional Commit

Inspect staged diff, generate a Conventional Commit message. Show it for review — DO NOT auto-commit (git commit is denied in settings.json).

## How to invoke

```
/commit              # uses currently staged changes
/commit --all        # stages all tracked changes first, then generates
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

Backend has not implemented GET /user/me yet. Stores
{ id, username, email } from the login response so the
app can show the current user across reloads. To be
replaced once the endpoint ships.
```

To commit:
  git commit -m "<paste subject>" -m "<paste body>"

Or open editor:
  git commit
─────────────────────────────────────────────────
````

### Step 6 — Self-check

Before presenting, verify:
- [ ] Subject ≤ 72 chars
- [ ] Type is from the allowed list
- [ ] Scope (if any) matches actual files changed
- [ ] No `console.log` or `// TODO without ticket` was added (warn user if present)
- [ ] No secrets / `.env` content in the diff (REFUSE TO PROCEED if found)

---

**Model:** Sonnet | **Effort:** Low
