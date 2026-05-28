# Styling Guide

> Full token tables (color, gradient, radius, font, shadow, hex→token map) → `tokens.md`.
> This file is the *how*; `tokens.md` is the *what*.

## Rules

- Tailwind utility classes only — no inline `style={{}}` (sole exception: `Avatar.tsx` dynamic sizing via CSS custom properties)
- No separate `.css` / `.module.css` files — only `index.css`
- No `.css` imports in components (except `main.tsx` → `index.css`)
- No hardcoded hex (`text-[#52525B]`) — use `tb-*` tokens
- No raw Tailwind palette (`text-gray-500`, `bg-blue-600`) — use `tb-*` tokens or semantic aliases
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

## Token quick-reference

Most-used (full list in `tokens.md`):
- Backgrounds: `bg-tb-base` (page), `bg-tb-surface` (cards), `bg-tb-elevated` (inputs)
- Text: `text-tb-secondary`, `text-tb-muted`, `text-tb-amber`, `text-tb-red`
- Border: `border-tb-border`
- Gradient text: `bg-tb-gradient-90 bg-clip-text text-transparent`

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
