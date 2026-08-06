# Styling Guide

> Full token tables (color, gradient, radius, font, shadow, hex→token map) → `.ai/tokens.md`.
> This file is the _how_; `.ai/tokens.md` is the _what_.

## Rules

- Tailwind utility classes only — no inline `style={{}}` (sole exception: `Avatar.tsx` dynamic sizing via CSS custom properties)
- No separate `.css` / `.module.css` files — only `index.css`
- No `.css` imports in components (except `main.tsx` → `index.css`)
- No hardcoded hex (`text-[#52525B]`) — use semantic aliases (`canvas-*`, `ink-*`, `accent-*`, `bdr`) or `tb-*` tokens; see `.ai/tokens.md` "Which System to Use"
- No raw Tailwind palette (`text-gray-500`, `bg-blue-600`) — use tokens; `accent-cyan` and `accent-green` are alias-only (no `tb-*` equivalent) and are the correct tokens for those colors
- No arbitrary spacing/sizing (`w-[437px]`) — use the Tailwind scale
- Fonts: `font-display` / `font-body` / `font-mono` — never bare `font-sans`
- Border-radius: `rounded-tb-*` tokens
- Conditional classes: `cn()` from `lib/format/utils.ts`

## cn() helper

```tsx
import { cn } from '@/lib/format/utils';

// ✅
<div className={cn('rounded-tb-card p-4', isActive && 'border border-tb-border')} />

// ❌
<div className={`rounded-tb-card p-4 ${isActive ? 'border border-tb-border' : ''}`} />
```

## Centering & Alignment

> Bug căn giữa hầu hết là vấn đề **runtime**, không phải class sai cú pháp — verify bằng screenshot + computed style (Chrome DevTools MCP), đừng chỉ đọc class rồi đoán.

### Icon button tròn — phải VUÔNG

Nút icon `<button>` sized (`size-*`) **BẮT BUỘC** dùng `<IconButton>` (`src/components/shared/IconButton.tsx`), KHÔNG dùng raw `<button>`. `IconButton` tự thêm `p-0 grid place-items-center type="button"`. Thiếu `p-0` → **UA padding mặc định của `<button>` nong box vượt quá `size-*`** → icon lệch tâm, nút to hơn `size-8` thật (đây là bug "icon bị lệch" hay gặp khi tạo nút mới). `size-*` ép `width = height` nên `rounded-full` ra hình tròn thật.

```tsx
// ✅ sized icon button → dùng IconButton (đã có p-0), vuông → tròn đều
<IconButton className="size-8 rounded-full hover:bg-canvas-elevated">
  <X size={16} className="shrink-0" />
</IconButton>

// ❌ raw <button> thiếu p-0 → UA padding nong box, icon lệch tâm
<button className="size-8 grid place-items-center rounded-full">

// ❌ w ≠ h → rounded-full thành BẦU DỤC (oval)
<button className="w-10 h-8 flex items-center justify-center rounded-full">
```

- Padded nav button KHÔNG sized (Header/NotificationBell) mới dùng raw `<button className="p-* grid place-items-center">`; `<span>`/`<Link>` icon container dùng `size-* grid place-items-center` (không cần `p-0`).
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

## Icon container — bảng quyết định

| Element | Pattern | Ví dụ |
|---|---|---|
| `<button>` sized icon-only | `<IconButton className="size-* …">` (tự có `p-0 grid place-items-center type="button"`) | `<IconButton className="size-8 rounded-full hover:bg-canvas-elevated text-ink-sec transition-colors shrink-0">` |
| `<button>` padded nav (Header, NotificationBell) — KHÔNG `size-*` | raw `<button className="p-* grid place-items-center">` | `<button className="p-2.5 rounded-[10px] grid place-items-center">` |
| `<span>` / `<Link>` icon container (LeftRail, notification item) | `size-* grid place-items-center` (không cần `p-0`) | `<span className="size-9 grid place-items-center rounded-tb-ghost">` |

- ❌ NEVER `w-* h-*` + `flex items-center justify-center` trên **bất kỳ** icon container nào.
- ✅ ALWAYS `shrink-0` trên **mọi** Lucide icon — button, span, link, dropdown, tất cả.
- ✅ ALWAYS `size={n}` dạng **number**, không bao giờ `size="n"` dạng string.
- Reuse icon container pattern có sẵn — không tự chế pattern mới.

### Trước khi đóng task UI (self-check)

- Sized icon `<button>` dùng `<IconButton className="size-* …">` — không phải raw `<button>` + `p-0 grid`
- Padded nav `<button>` (Header) dùng raw `<button className="p-* grid place-items-center">`
- `<span>` / `<Link>` icon container dùng `size-* grid place-items-center`
- Không còn `w-* h-* flex items-center justify-center` trên icon container nào
- Mọi Lucide icon có `shrink-0` + `size={n}` (number)
- Dùng design token có sẵn, reuse component pattern có sẵn (thứ tự tra cứu `ui/` → `shared/` → feature → tạo mới, xem core.md)
- Không thêm tổ hợp Tailwind tự chế không cần thiết
- Mở element thật bằng MCP, đọc box model: nút icon tròn phải `width === height`.
- So `git diff` để chắc không thêm border / ring / padding ngoài scope.

## Token quick-reference

Most-used (full list and system guidance in `.ai/tokens.md`):

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

`src/` currently has **zero** hardcoded hex (`[#...]`) — keep it that way.

The only sanctioned `style={{}}` usages are dynamic values that cannot be expressed as a
static utility class (`Avatar.tsx` sizing, progress-bar widths, chart colors). See
`.ai/workflows/check-tailwind.md` Check 1 for the exact allow-list and the preferred
CSS-custom-property form.
