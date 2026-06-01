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

1. **Read context files** — the `context/` files, `tokens.md`, `api-reference.md` for documented behavior
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
  Subject:  Cart state persistence
  Aspect:   How and where cart is saved/restored across reloads
  Boundary: src/context/CartContext.tsx, src/features/cart/

FINDINGS

1. Cart state lives in CartContext (src/context/CartContext.tsx:18-45)
   - useState<CartItem[]> as source of truth
   - useEffect writes to localStorage on every change (key: 'cart')
   - Initial state lazy-reads localStorage on mount

2. CartSidebar (src/features/cart/CartSidebar.tsx) consumes via useCartContext()
   - No direct localStorage access ✓

3. CheckoutPage clears cart on order success (line 78) via setCart([])
   - localStorage gets cleared by the useEffect ✓

INCONSISTENCIES
  - CartContext uses key 'cart' (no namespace); AuthContext uses key 'user'.
    Not a bug, just worth noting for future SSR/multi-tab work.

QUESTIONS RAISED (not answered here)
  - What happens on multi-tab edit? No cross-tab sync detected.
  - localStorage quota — large carts could hit limits, no handling.

NO ACTION TAKEN
  This is a research report. Run /debug or /scaffold-feature if action needed.
─────────────────────────────────────────────────
```

---

**Model:** Sonnet 4.6 | **Effort:** Low
