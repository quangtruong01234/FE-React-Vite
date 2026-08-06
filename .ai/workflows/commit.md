# /commit — Commit Changes

Group all pending changes by scope and create separate commits.

## How to invoke

```
/commit              # show proposed commits for review
/commit --auto       # create commits automatically
```

---

## Protocol

### Step 1 — Inspect

```bash
git status
git diff --stat        # unstaged
git diff --cached --stat  # staged
```

If nothing changed → report `[NOTHING TO COMMIT]` and stop.

### Step 2 — Group files by scope

Map each file to a scope:

| File path pattern                     | Scope      |
|---------------------------------------|------------|
| `src/features/auth/`                  | `auth`     |
| `src/features/product/`               | `product`  |
| `src/features/cart/`                  | `cart`     |
| `src/features/order/`                 | `order`    |
| `src/features/social/`                | `social`   |
| `src/features/<other>/`               | `<other>`  |
| `src/api/`, `src/types/`, `src/hooks/`, `src/lib/`, `src/components/`, `src/context/`, `src/router.tsx`, `src/routerLayouts.tsx` | `core` |
| `src/test/`, `e2e/`, `*.test.ts(x)` when they are the whole change | `test` |
| `.ai/`, `AGENTS.md`, `.gitignore` AI entries | `ai` |
| `.claude/`, `.codex/`, `.agents/` tool adapters | `ai` |
| `tailwind.config.js`, `vite.config.*`, `tsconfig.*`, `package.*` | `build` |

Files that span multiple feature scopes → group into `core` unless one scope clearly dominates.

### Step 3 — Classify each group

Pick ONE type per commit:

| Type       | Use when                                      |
|------------|-----------------------------------------------|
| `feat`     | New user-facing feature or component          |
| `fix`      | Bug fix                                       |
| `refactor` | Code restructure, no behavior change          |
| `perf`     | Performance improvement                       |
| `style`    | Formatting/whitespace only, no logic change   |
| `docs`     | Documentation only                            |
| `test`     | Add or update tests                           |
| `build`    | Build system, config, deps                    |
| `chore`    | Routine tasks — agent guidance, adapters, tooling |

**Banned:** "update", "fix bug", "change", "edit", "wip" — never use as a type.

### Step 4 — Write commit messages

Format:
```
<type>(<scope>): <subject>
```

Subject rules:
- ≤ 72 chars
- Imperative mood ("add", "fix", "remove" — not "added", "fixes")
- No trailing period
- Lowercase first letter

Body: only if the change is non-obvious or breaks something. Skip if self-explanatory.

### Step 5 — Output plan

Present the proposed commits grouped in order:

```
── Proposed Commits ─────────────────────────────
1. feat(social)  → src/features/social/
2. feat(core)    → src/api/index.ts, src/types/index.ts, src/hooks/query/queryKeys.ts, src/hooks/auth/useRole.ts
3. feat(product) → src/features/product/
4. fix(auth)     → src/features/auth/
5. fix(cart)     → src/features/cart/
6. chore(build)  → tailwind.config.js
7. chore(ai) → .ai/, AGENTS.md, tool adapters
─────────────────────────────────────────────────
```

### Step 5.5 — Auto-commit (only if `--auto` flag is present)

For each group in order:
```bash
git add <files in group>
git commit -m "<type>(<scope>): <subject>"
```

Do **not** push. After all commits, report:

```
── Committed ────────────────────────────────────
[1/5] feat(social): add feed page, post card, and create post modal  abc1234
[2/5] feat(core): expand api client and types for social/orders/inventory  def5678
...
─────────────────────────────────────────────────
```

### Step 6 — Self-check (per commit)

- [ ] Subject ≤ 72 chars
- [ ] Type is from the allowed list, not banned
- [ ] Scope matches the files in that group
- [ ] No `console.log` or bare `// TODO` added (warn if found)
- [ ] No `.env` / secrets in diff (REFUSE TO PROCEED if found)
- [ ] No `../.agent-local/` file staged — handoff/test-account files live outside the repo and must never be committed
