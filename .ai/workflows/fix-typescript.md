# /fix-typescript — TypeScript Error Fix Loop

Run `npm run build` (which includes `tsc --noEmit`), parse errors, fix them, repeat until clean.

## How to invoke

```
/fix-typescript                # fix all errors in the project
/fix-typescript <file>         # focus on a specific file's errors
```

---

## Protocol

### Step 1 — Capture errors

```bash
npx tsc --noEmit
```

If output shows `Found 0 errors`, exit with `[✅ CLEAN] No TypeScript errors.`

> Keep the errors in context — don't pipe them to a temp file. `tee`/`/tmp` do not exist on the
> Windows shell this repo runs on.

### Step 2 — Group errors

Parse by file. For each file, list its errors with line + TS error code (e.g. `TS2322`).

```
src/features/product/MarketplacePage.tsx
  L42  TS2322  Type 'string' is not assignable to type 'number'.
  L88  TS2339  Property 'foo' does not exist on type 'Product'.
```

> ⚠️ A `string`→`number` mismatch on an **ID** is usually the *consumer* being wrong, not the ID.
> Converted public IDs (`usr_`, `prod_`, `ord_`, …) are opaque strings — widen the consumer, never
> "fix" it with `Number(id)`.

### Step 3 — Fix Priority Order

1. **Type narrowing issues** (`TS2532`, `TS18048`) — add proper guards, not `!`
2. **Type mismatch** (`TS2322`, `TS2345`) — fix the underlying type or convert correctly
3. **Missing properties** (`TS2339`, `TS2741`) — check if type definition needs updating in `types/index.ts`
4. **Unused vars** (`TS6133`) — remove or prefix with `_`
5. **Implicit any** (`TS7006`, `TS7053`) — add explicit type

### Step 4 — Forbidden Shortcuts

❌ Do NOT use these to "fix" errors:
- `as any` — banned
- `!` non-null assertion — use proper guard
- `@ts-ignore` / `@ts-expect-error` — banned without ticket reference comment
- `as unknown as T` double-cast — banned, fix the source type

If a fix genuinely requires one of the above, **stop and report** — do not commit it.

### Step 5 — Loop

After fixing, re-run `npx tsc --noEmit`.
- If errors decreased → continue loop, max 5 iterations
- If errors increased → revert last change, report regression, stop
- If errors unchanged after a fix attempt → stop, report which file is stuck

### Step 6 — Final verification

```bash
npm run build
```

Must pass before declaring done.

---

## Output Format

```
── Iteration 1 ──────────────────────────────
  Errors before : 12
  Files touched : src/features/product/MarketplacePage.tsx, src/features/product/useProducts.ts
  Errors after  : 4
─────────────────────────────────────────────

── Iteration 2 ──────────────────────────────
  Errors before : 4
  Files touched : src/api/index.ts
  Errors after  : 0
─────────────────────────────────────────────

✅ TypeScript clean. npm run build passed.
```

If stuck:
```
❌ Stuck at iteration N
   Remaining errors require human input:
   - src/foo.ts:42 — needs decision on whether to widen the type or narrow the input
```

---

**Escalate** to a higher reasoning effort if the same file regresses 3+ times.
