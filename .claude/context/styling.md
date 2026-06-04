# Styling Guide

> Full token tables (color, gradient, radius, font, shadow, hex→token map) → `tokens.md`.
> This file is the _how_; `tokens.md` is the _what_.

## Rules

- Tailwind utility classes only — no inline `style={{}}` (sole exception: `Avatar.tsx` dynamic sizing via CSS custom properties)
- No separate `.css` / `.module.css` files — only `index.css`
- No `.css` imports in components (except `main.tsx` → `index.css`)
- No hardcoded hex (`text-[#52525B]`) — use semantic aliases (`canvas-*`, `ink-*`, `accent-*`, `bdr`) or `tb-*` tokens; see `tokens.md` "Which System to Use"
- No raw Tailwind palette (`text-gray-500`, `bg-blue-600`) — use tokens; `accent-cyan` and `accent-green` are alias-only (no `tb-*` equivalent) and are the correct tokens for those colors
- No arbitrary spacing/sizing (`w-[437px]`) — use the Tailwind scale
- Fonts: `font-display` / `font-body` / `font-mono` — never bare `font-sans`
- Border-radius: `rounded-tb-*` tokens
- Conditional classes: `cn()` from `lib/utils.ts`

## cn() helper

```tsx
import { cn } from '@/lib/utils';

// ✅
<div className={cn('rounded-tb-card p-4', isActive && 'border border-tb-border')} />

// ❌
<div className={`rounded-tb-card p-4 ${isActive ? 'border border-tb-border' : ''}`} />
```

## Centering & Alignment

> Bug căn giữa hầu hết là vấn đề **runtime**, không phải class sai cú pháp — verify bằng screenshot + computed style (Chrome DevTools MCP), đừng chỉ đọc class rồi đoán.

### Icon button tròn — phải VUÔNG

Nút icon tròn = `size-* grid place-items-center` (rule gốc trong CLAUDE.md). `size-*` ép `width = height` nên `rounded-full` ra hình tròn thật.

```tsx
// ✅ vuông → tròn đều
<button className="size-8 grid place-items-center rounded-full">
  <X size={16} className="shrink-0" />
</button>

// ❌ w ≠ h → rounded-full thành BẦU DỤC (oval)
<button className="w-10 h-8 flex items-center justify-center rounded-full">
```

- `rounded-full` + `border` trên element KHÔNG vuông → viền oval. Luôn `size-*` cho nút tròn, không dùng `w-* h-*` lệch nhau.
- Lucide icon trong nút icon-only: luôn `shrink-0` (tránh méo khi flex co lại).
- Đừng tự thêm `border` / ring trang trí khi "fix" — vi phạm minimal diff. Reuse nút close có sẵn (Dialog/Sheet) thay vì chế viền mới.

### Flex/grid centering cần kích thước trục chéo

- `items-center` không làm gì nếu parent không có chiều cao xác định (parent chỉ cao bằng content). Cần `h-*` / `min-h-*` hoặc để parent stretch.
- Center cả 2 trục: `grid place-items-center` (gọn nhất) hoặc `flex items-center justify-center`.

### `mx-auto`

- Chỉ căn giữa ngang khi element là block-level VÀ có width xác định (`w-*` / `max-w-*`). `mx-auto` trên inline hoặc full-width element không có tác dụng.

### Absolute centering

```tsx
// ✅ căn giữa tuyệt đối trong parent relative
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
```

- Parent phải `relative`. Thiếu 1 trong 2 `-translate-*` → lệch đúng nửa kích thước element.

### Text căn giữa dọc

- Single-line trong khối có height: dùng `flex items-center` / `grid place-items-center` — KHÔNG hack `leading-*` cho vừa khít.
- Icon + text trong 1 hàng: `inline-flex items-center gap-*`, icon thêm `shrink-0`.

### Trước khi đóng task UI (self-check)

- Mở element thật bằng MCP, đọc box model: nút icon tròn phải `width === height`.
- So `git diff` để chắc không thêm border / ring / padding ngoài scope.

## Token quick-reference

Most-used (full list and system guidance in `tokens.md`):

- Backgrounds: `bg-canvas-base` (page), `bg-canvas-surface` (cards), `bg-canvas-elevated` (inputs)
- Text: `text-ink-pri` (white), `text-ink-sec`, `text-ink-muted`
- Accent: `text-accent-amber` (brand/prices), `text-accent-red` (danger), `text-accent-green` (success), `text-accent-cyan` (info)
- Border: `border-bdr`
- Gradient text: `bg-tb-gradient-90 bg-clip-text text-transparent` (`tb-*` only — no alias for gradients)
- Border-radius: `rounded-tb-*` (`tb-*` only — no alias for radius)

## Loading states

```tsx
if (isLoading) return <Skeleton className="h-32 w-full rounded-tb-card" />;
```

Use `<Skeleton />` from shadcn — never spinners or empty renders during initial fetch.

## shadcn/ui

Available: `button`, `badge`, `card`, `dialog`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`, `textarea`, `tooltip`.

- Import: `import { Button } from '@/components/ui/button'`
- Install new: `npx shadcn add <name>`
- Never edit files in `src/components/ui/` — extend via `className` or wrap in `components/shared/`

## Known violations — do not repeat

See `tokens.md` → "Known Violations" table. Summary: `ProductListPage.tsx` and `LoginPage.tsx` have hardcoded hex that should be tokens; `Avatar.tsx` `style={{}}` is a deliberate exception.
