# /audit-duplicates — Find Duplicates Before Creating

Scan `frontend/src/` for hooks/components/utils that already do what you're about to write.
Goal: prevent duplicate implementations that drift over time.

## How to invoke

```
/audit-duplicates <name-or-purpose>
```

Examples:
- `/audit-duplicates useLogin` → searches for any login-related hooks
- `/audit-duplicates "price formatting"` → searches for price/currency utilities
- `/audit-duplicates Avatar` → checks for existing avatar components

---

## Protocol

### Step 1 — Decide search scope from input

Parse the input as either:
- **Identifier-like** (`useLogin`, `Avatar`, `formatPrice`) → exact + fuzzy name search
- **Concept-like** (`"price formatting"`, `"user authentication"`) → keyword search across file names, exports, JSDoc

### Step 2 — Search hooks (`src/hooks/` + `src/features/**/use*.ts`)

```bash
# Find hooks by name
find frontend/src -name 'use*.ts' -o -name 'use*.tsx' | xargs grep -l '<keyword>'

# Find exported function/const names matching keyword
grep -rn 'export (function|const) \w*<Keyword>' frontend/src --include='*.ts' --include='*.tsx'
```

For each match, report:
- File path
- Exported names
- One-line purpose (from JSDoc or first usage)

### Step 3 — Search components (`src/components/` + `src/features/**/*.tsx`)

```bash
grep -rn 'export (function|const|default)' frontend/src --include='*.tsx' | grep -i '<keyword>'
```

### Step 4 — Search utilities (`src/lib/` + `src/api/`)

```bash
grep -rn 'export ' frontend/src/lib frontend/src/api | grep -i '<keyword>'
```

### Step 5 — Verdict

For each candidate, classify:

- ✅ **EXACT MATCH** — already exists, do not create. Use this instead.
- 🟡 **SIMILAR** — overlapping purpose. Consider extending instead of duplicating.
- 🔵 **RELATED** — different purpose but worth knowing about. Safe to create new one.

---

## Output Format

```
── Audit: useLogin ──────────────────────────────

✅ EXACT MATCH
  src/features/auth/useLogin.ts
  Exports: useLogin
  Purpose: POST /user/login mutation, calls loginSuccess() on success.
  → DO NOT create a new one. Import this.

🟡 SIMILAR (1)
  src/hooks/useAuth.ts
  Exports: useAuth, useLogout
  Purpose: Auth state container; useLogout mutation included.
  → Login itself lives in useLogin. Consider whether your new code
    belongs in useAuth instead.

🔵 RELATED (1)
  src/context/AuthContext.tsx
  Exports: AuthProvider, useAuthContext
  Purpose: Wraps useAuth for cross-component access.
  → Different layer. Read this before deciding where new code goes.

─────────────────────────────────────────────────
Recommendation: USE EXISTING useLogin — do not create a new file.
```

If no matches:
```
── Audit: useWishlist ───────────────────────────
✅ No matches found in frontend/src/.
   Safe to create features/wishlist/useWishlist.ts.
─────────────────────────────────────────────────
```

---

**Model:** Sonnet 4.6 | **Effort:** Low
