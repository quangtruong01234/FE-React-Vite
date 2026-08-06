# /check-perf — Static Performance Anti-Pattern Scan

Scan `src/` for high-confidence performance smells. Report only — NEVER auto-fix (perf fixes are easy to over-apply; the developer decides). Mirrors `/check-tailwind`.

> Rule source: `.ai/context/performance.md`. This command catches only what is grep-detectable. Real performance must be MEASURED — see "What this cannot catch" at the end.

## How to invoke

```
/check-perf                  # scan all of src/
/check-perf <file-or-folder> # scan a specific path
```

## Scan Protocol

### Check 1 — whole-lib lodash import (🔴 red)

Whole-lib import kills tree-shaking. Must be per-method.

```
Pattern: import\s+(\*\s+as\s+)?_\s+from\s+['"]lodash['"]
Scope: src/**/*.{ts,tsx}
Fix: import debounce from 'lodash/debounce'
```

### Check 2 — non-memoized Context value (🟡 yellow)

A new value object every render re-renders every consumer.

```
Pattern: value=\{\{
Scope: src/context/**/*.tsx
Note: flag if the object literal is not wrapped in useMemo. Manual confirm.
```

### Check 3 — array index as list key (🟡 yellow)

Unstable for dynamic/reorderable lists. OK for static lists — confirm manually.

```
Pattern: key=\{(i|idx|index)\}
Scope: src/**/*.tsx
```

### Check 4 — nested search inside .map (🟡 yellow)

O(n\*m) — build a Map/Set lookup once instead.

```
Pattern: \.map\([^)]*\).*\.(find|filter|findIndex|some)\(
Scope: src/**/*.tsx
Limitation: only catches single-line cases. Multi-line .map blocks are missed — eyeball list-rendering hooks manually.
```

### Check 5 — <img> without explicit dimensions (🟡 yellow)

Missing width/height causes layout shift (CLS).

```
Pattern: <img\s   (flag lines that do NOT contain both width= and height=, or an aspect-ratio class)
Scope: src/**/*.tsx
```

### Check 6 — route-level page not lazy-loaded (ℹ️ info)

In router.tsx, page components imported statically instead of via React.lazy.

```
Scope: src/router.tsx
Note: info only — small apps may intentionally skip lazy-loading. Flag, don't pressure.
```

## Output Format

```
[🔴 VIOLATION] src/utils/foo.ts:3 — whole-lib lodash import (use lodash/<method>)
[🟡 WARN]      src/context/AuthContext.tsx:22 — value={{...}} not memoized
[🟡 WARN]      src/features/order/OrderList.tsx:40 — key={index} on dynamic list
[ℹ️ INFO]      src/router.tsx:8 — OrderHistoryPage imported statically (consider React.lazy)
```

If clean:

```
[✅ CLEAN] No static performance anti-patterns found in src/
```

## Summary (always end with this)

```
── Perf Scan Summary ───────────────────────────
  Files scanned          : N
  🔴 lodash whole-import : a
  🟡 unmemoized context  : b
  🟡 index-as-key        : c
  🟡 nested-search-map   : d
  🟡 img no-dimensions   : e
  ℹ️ non-lazy routes     : f
  Total flags            : a+b+c+d+e+f
────────────────────────────────────────────────
```

## What this CANNOT catch — MEASURE these, don't guess

- **Unnecessary re-renders** → React DevTools Profiler (record an interaction, look for components rendering with unchanged props).
- **Bundle size / what's heavy** → `npm run build`, then a bundle visualizer (e.g. rollup-plugin-visualizer / `npx vite-bundle-visualizer`). NOTE: needs a dev dep — ASK before installing (core.md: no new deps without asking).
- **LCP / CLS / INP runtime metrics** → Lighthouse (Chrome DevTools) or `npx lighthouse <url>`.
- **O(n²) that only bites at scale** → reason about real data size; grep can't see runtime n.

> Do NOT recommend useMemo/useCallback/React.memo from this scan alone. Recommend them only after a Profiler trace shows a real re-render cost. Otherwise you violate the "don't optimize speculatively" rule in `.ai/context/performance.md`.
