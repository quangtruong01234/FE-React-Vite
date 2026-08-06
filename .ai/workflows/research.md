# /research — Read-Only Investigation

Investigate a topic in the codebase and produce findings. **No file edits.** No code changes. Pure research output.

## How to invoke

```
/research <question or topic>
```

Examples:
- `/research "how does cart state persist across reloads"`
- `/research "what happens when a 401 occurs after login"`
- `/research "where are query keys defined and how consistent is usage"`

---

## Protocol

### Step 1 — Scope the question

Parse the input into:
- **Subject**: what entity/feature is being investigated
- **Aspect**: what specifically — data flow, error handling, naming, consistency, etc.
- **Boundary**: which directories matter — usually `src/`, sometimes only one feature

Write this scope at the top of the report.

### Step 2 — Gather evidence

Use these in order, stopping when you have enough:

1. **Read context files** — the `context/` files, `.ai/tokens.md`, `.ai/api-reference.md` for documented behavior
2. **Grep for entry points** — feature pages, hooks, routes
3. **Trace data flow** — follow imports, follow hook usage, follow query keys
4. **Read related files in full** — never paraphrase from a snippet alone

### Step 3 — Identify inconsistencies

Note where:
- Code contradicts documentation
- Two implementations diverge (e.g. one feature uses `queryKeys.*`, another uses inline strings)
- TODOs or temporary workarounds exist
- Types disagree with runtime shape

### Step 4 — Report (NO FIXES)

Produce a structured report. Do not edit any file. Do not suggest a PR. Just inform.

---

## Output Format

```
── Research: <topic> ────────────────────────────

SCOPE
  Subject:  Cart state
  Aspect:   Where the cart lives and how it survives a reload
  Boundary: src/hooks/data/useCart.ts, src/hooks/query/cartCache.ts, src/features/cart/

FINDINGS

1. Cart is server state, not client state (src/hooks/data/useCart.ts)
   - useQuery on queryKeys.cart.* — the backend owns the cart
   - No CartContext, no localStorage persistence

2. CartPage (src/features/cart/CartPage.tsx) consumes useCart()
   - No direct api/ or fetch access ✓

3. Mutations write through cartCache.ts helpers (src/hooks/query/cartCache.ts)
   - Optimistic update + invalidate on settle

INCONSISTENCIES
  - <none found> / <or: file:line + what diverges>

QUESTIONS RAISED (not answered here)
  - Multi-tab: does a cart mutation in tab A refresh tab B? No broadcast detected.

NO ACTION TAKEN
  This is a research report. Run /debug or /scaffold-feature if action needed.
─────────────────────────────────────────────────
```
