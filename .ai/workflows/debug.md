# /debug — Error Triage Workflow

Systematic error investigation. No guessing — read first, reproduce second, fix last.

## How to invoke

```
/debug <error-message-or-symptom>
```

Examples:
- `/debug "Cannot read property 'id' of undefined in ProductDetail"`
- `/debug "401 on /products/with-inventory/all after login"`
- `/debug "Cart resets on page refresh"`

---

## Protocol — DO NOT SKIP STEPS

### Step 1 — Read the evidence (no fixes yet)

1. **Identify the file(s)** mentioned in the error. Read them in full.
2. **Trace the data flow** backwards: where does the undefined value come from? Read each upstream file.
3. **Check related types** in `types/index.ts`.
4. **Check related API contracts** in `.ai/api-reference.md` — is the response shape what the code expects?

### Step 2 — Reproduce mentally

Before writing any fix, articulate:
- What is the actual behavior?
- What is the expected behavior?
- What is the minimal trigger sequence?

Write this as a `// REPRO:` comment in your investigation notes. If you can't articulate it, you haven't read enough.

### Step 3 — Form a root-cause hypothesis

State the hypothesis explicitly:
```
HYPOTHESIS: The 401 happens because LoginPage doesn't await the loginSuccess()
call before navigating, so the cookie isn't set in the next request.
```

If you cannot state a single concrete hypothesis, return to Step 1.

### Step 4 — Verify hypothesis BEFORE fixing

Pick ONE of:
- Add a `console.log` at the suspected point, reproduce, check output, then REMOVE the log
- Read the actual data shape returned by the API (e.g. via curl or network tab description)
- Trace a specific user action end-to-end through the code

### Step 5 — Fix with minimal diff

- Change only what the hypothesis requires.
- Do NOT refactor unrelated code while you're here.
- Do NOT add features.
- **Add a test — mandatory.** Every fix ships with a colocated `*.test.ts(x)` that fails before the fix and passes after. Extract the logic into a pure helper if it's stuck inline in a component. See `.ai/testing.md`.

### Step 6 — Verify the fix

1. Re-read the changed code — does it actually address the hypothesis?
2. Run `npm run build` — TS must pass.
3. Run `npm run lint` — must pass.
4. Mentally re-trace the original trigger sequence with the fix in place.

---

## Anti-patterns — STOP if you find yourself doing these

- **Adding `?.` everywhere** to silence errors without understanding why the value is undefined
- **Adding `try/catch` to swallow an error** without logging or handling it
- **Changing types to match runtime** without checking if the type was correct and runtime is wrong
- **"Fixing" by removing the code that errors** instead of fixing the upstream cause
- **Re-implementing** instead of fixing — see `/audit-duplicates` first

---

## Output Format

```
── Debug: <symptom> ─────────────────────────────

EVIDENCE
  - src/features/product/ProductDetail.tsx:24 — `product.id` accessed without null check
  - src/hooks/useProduct.ts:8 — useQuery returns undefined while loading
  - No loading guard in component

REPRO
  1. Navigate to /product/1
  2. Component renders before query resolves
  3. product is undefined → product.id throws

HYPOTHESIS
  Missing isLoading guard before accessing query data.

VERIFICATION
  Read useProduct.ts confirms it returns { data: undefined, isLoading: true } initially.
  ProductDetail.tsx does not check isLoading before destructuring.

FIX
  Added isLoading + error guards before destructuring product.
  Files changed: src/features/product/ProductDetail.tsx (1 file, 6 lines)

VERIFIED
  npm run build : ✅
  npm run lint  : ✅
  Manual trace  : ✅ component now renders Skeleton during load
─────────────────────────────────────────────────
```

If escalation needed:
```
ESCALATE — root cause not identified after 3 hypothesis cycles.
Recommend: invoke `debugger` agent for deep investigation.
```
Escalate when 3+ hypothesis cycles fail, or the error spans the backend boundary.
