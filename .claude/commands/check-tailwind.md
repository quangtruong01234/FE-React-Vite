# /check-tailwind — Tailwind Compliance Scan

Scan `frontend/src/` and report styling violations. Do not auto-fix — only report.

## How to invoke

```
/check-tailwind                    # scan all of frontend/src/
/check-tailwind <file-or-folder>   # scan a specific path
```

<!--
DESIGN DECISIONS — không thay đổi:
1. 7 checks chạy tách biệt, không merge thành 1 regex (Check 7 là 2-step grep: filter rồi check)
2. Exception list cố định: index.css, main.tsx, Avatar.tsx
3. Output format: [VIOLATION] filepath — type at line N
4. Summary cuối cùng có count per category
5. Check 7 là heuristic 🟡 (grep không xác định được vuông/không runtime) — verify thật bằng /verify-ui hoặc MCP
-->

---

## Pre-check

Verify `frontend/src/index.css` exists and starts with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

If missing, report `[CRITICAL] index.css missing or malformed` and stop.

---

## Scan Protocol — 7 Checks

### Check 1 — inline `style={{}}` props

```
Pattern: style=\{\{
Scope: frontend/src/**/*.tsx
Exception: frontend/src/components/shared/Avatar.tsx
```

### Check 2 — `.css` / `.module.css` files in `src/`

```
Glob: frontend/src/**/*.css
Exception: frontend/src/index.css
```

### Check 3 — `.css` imports in `.tsx` files

```
Pattern: import.*\.css
Scope: frontend/src/**/*.tsx
Exception: import './index.css' in main.tsx
```

### Check 4 — hardcoded hex colors

Project uses `tb-*` tokens and semantic aliases (`canvas-*`, `ink-*`, `accent-*`, `bdr`) for all design colors. Raw hex is always a violation.

```
Pattern: \[#[0-9a-fA-F]{3,8}\]
Scope: frontend/src/**/*.tsx
```

Known replacements (preferred alias listed first; see `tokens.md` "Which System to Use"):
| Hex | Preferred token | `tb-*` alternative |
|---|---|---|
| `#09090B` | `bg-canvas-base` | `bg-tb-base` |
| `#111113` | `bg-canvas-surface` | `bg-tb-surface` |
| `#1C1C1E` | `bg-canvas-elevated` | `bg-tb-elevated` |
| `#27272A` | `border-bdr` | `border-tb-border` |
| `#52525B` | `text-ink-muted` | `text-tb-muted` |
| `#A1A1AA` | `text-ink-sec` | `text-tb-secondary` |
| `#F59E0B` | `text-accent-amber` | `text-tb-amber` |
| `#EF4444` | `text-accent-red` | `text-tb-red` |
| `#06b6d4` | `text-accent-cyan` | **no `tb-*`** — alias only |
| `#10b981` | `text-accent-green` | **no `tb-*`** — alias only |
| `#0B0B0E` | `bg-canvas-base` | `bg-tb-base` (close — verify with designer) |

### Check 5 — raw Tailwind palette colors

Project uses `tb-*` tokens and semantic aliases. Bare palette (`text-gray-500`, `bg-blue-600`) bypasses the design system.

```
Pattern: \b(text|bg|border|ring|divide|placeholder|caret|fill|stroke|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b
Scope: frontend/src/**/*.tsx
```

Fix: map to the closest token from `tokens.md` (semantic alias preferred; `tb-*` for non-color tokens). Note: `accent-cyan` and `accent-green` are the correct tokens for cyan and green — these are NOT violations when written as `text-accent-cyan` / `text-accent-green`.

### Check 6 — arbitrary spacing/sizing values

Tailwind scale should be used. Arbitrary values (`w-[437px]`, `mt-[13px]`) bypass it.

```
Pattern: \b(w|h|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|top|right|bottom|left|space-x|space-y)-\[[0-9]+(\.[0-9]+)?(px|rem|em|%)\]
Scope: frontend/src/**/*.tsx
```

Severity: 🟡 yellow — not a hard error (sometimes needed for pixel-perfect), but worth flagging.

### Check 7 — circular button không dùng `size-*` (oval / off-center risk)

Nút bo tròn (`rounded-full`) nên dùng `size-*` (ép `width = height`) để tránh biến thành **bầu dục**, và `grid place-items-center` để icon căn giữa thật (xem icon-button rule trong CLAUDE.md). `rounded-full` trên element không vuông + `flex items-center justify-center` là nguồn bug căn giữa hay gặp nhất.

```
Step 1 — filter: \brounded-full\b
Step 2 — trong các dòng đó, flag nếu KHÔNG có \bsize-\d và thoả một trong:
  (a) có "flex items-center justify-center"   → nên đổi sang "grid place-items-center"
  (b) có cả \bw-\S+ lẫn \bh-\S+ riêng         → nên gộp thành size-*
Scope: frontend/src/**/*.tsx
```

Severity: 🟡 yellow — heuristic, KHÔNG phải mọi case đều sai (vd badge/pill cố ý dài). grep không biết element có vuông lúc render hay không → phải verify visual bằng `/verify-ui` hoặc screenshot qua Chrome DevTools MCP trước khi sửa.

---

## Output Format

```
[🔴 VIOLATION] src/features/product/ProductListPage.tsx:42 — inline style={{}}
[🔴 VIOLATION] src/features/checkout/checkout.module.css — .css file in src/
[🔴 VIOLATION] src/features/cart/CartSidebar.tsx:3 — .css import
[🔴 VIOLATION] src/features/product/ProductListPage.tsx:376 — hardcoded hex [#1C1C1E] (use bg-tb-elevated)
[🔴 VIOLATION] src/features/order/OrderCard.tsx:24 — raw palette text-gray-500 (use text-tb-muted)
[🟡 WARN]      src/features/product/ProductDetail.tsx:88 — arbitrary value w-[437px]
[🟡 WARN]      src/features/profile/FollowListModal.tsx:31 — rounded-full + w-/h- (use size-* grid place-items-center)
```

If clean:

```
[✅ CLEAN] No Tailwind violations found in frontend/src/
```

## Summary (always end with this)

```
── Tailwind Audit Summary ──────────────────────
  Files scanned        : N
  🔴 Inline styles     : a
  🔴 .css files        : b
  🔴 .css imports      : c
  🔴 Hardcoded hex     : d
  🔴 Raw palette       : e
  🟡 Arbitrary values  : f
  🟡 Circular non-size : g
  Total violations     : a+b+c+d+e+f+g
────────────────────────────────────────────────
```
