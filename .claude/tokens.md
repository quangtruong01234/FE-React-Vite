# Design Tokens — TryBuy

Dark-theme design system. All tokens defined in `tailwind.config.ts`.
**Never hardcode hex/rgb values** — if a token doesn't exist, add it to the config first.

## Color Tokens — `tb-*`

| Token | Hex | Use for |
|---|---|---|
| `bg-tb-base` | `#09090B` | Page background |
| `bg-tb-surface` | `#111113` | Cards, panels |
| `bg-tb-elevated` | `#1C1C1E` | Inputs, elevated surfaces |
| `border-tb-border` | `#27272A` | Borders |
| `text-tb-muted` | `#52525B` | Placeholder, disabled text |
| `text-tb-secondary` | `#A1A1AA` | Secondary text |
| `text-tb-amber` | `#F59E0B` | Accent amber |
| `text-tb-red` | `#EF4444` | Danger / accent red |

## CSS-Variable Semantic Aliases

| Token | Resolves to |
|---|---|
| `bg-canvas-base` | `var(--bg-base)` |
| `bg-canvas-surface` | `var(--bg-surface)` |
| `bg-canvas-elevated` | `var(--bg-elevated)` |
| `text-ink-pri` | `var(--text-primary)` |
| `text-ink-sec` | `var(--text-secondary)` |
| `text-ink-muted` | `var(--text-muted)` |
| `text-accent-pri` | `var(--accent-primary)` |
| `text-accent-cyan` | `var(--accent-cyan)` |
| `text-accent-green` | `var(--accent-green)` |
| `border-bdr` | `var(--border)` |

## Gradients

| Token | Definition |
|---|---|
| `bg-tb-gradient` | `linear-gradient(135deg, #F59E0B, #EF4444)` |
| `bg-tb-gradient-90` | `linear-gradient(90deg, #F59E0B, #EF4444)` |
| `bg-login-left` | Radial amber+red glow for auth page |

Usage example (gradient text):
```tsx
<span className="bg-tb-gradient-90 bg-clip-text text-transparent">$99</span>
```

## Border Radius

| Token | Value | Use for |
|---|---|---|
| `rounded-tb-pill` | `6px` | Pills, small chips |
| `rounded-tb-ghost` | `8px` | Ghost buttons |
| `rounded-tb-input` | `10px` | Inputs, text fields |
| `rounded-tb-cta` | `12px` | Primary CTAs |
| `rounded-tb-card` | `16px` | Cards, product tiles |
| `rounded-tb-sheet` | `20px` | Sheets, modals |

## Fonts

| Token | Family | Use for |
|---|---|---|
| `font-display` | Barlow Condensed | Headings, hero text |
| `font-body` | DM Sans | Body, UI text |
| `font-mono` | JetBrains Mono | Code, prices, numbers |

> Never use bare `font-sans` / `font-serif` — always pick one of these three.

## Shadows

| Token | Use for |
|---|---|
| `shadow-tb-cta` | Amber glow on primary CTAs |
| `shadow-tb-card` | Card elevation in dark mode |

## Hex → Token Mapping (for `/check-tailwind`)

| Hex | Replacement |
|---|---|
| `#09090B` | `bg-tb-base` |
| `#111113` | `bg-tb-surface` |
| `#1C1C1E` | `bg-tb-elevated` |
| `#27272A` | `border-tb-border` / `bg-tb-border` |
| `#52525B` | `text-tb-muted` |
| `#A1A1AA` | `text-tb-secondary` |
| `#F59E0B` | `text-tb-amber` |
| `#EF4444` | `text-tb-red` |
| `#0B0B0E` | `bg-tb-base` (close enough — verify with designer) |

## Conditional classes — `cn()`

`cn()` from `lib/utils.ts` wraps `clsx` + `tailwind-merge`. Always use for conditional classes.

```tsx
import { cn } from '@/lib/utils';

<div className={cn('rounded-tb-card p-4', isActive && 'border border-tb-border')} />
```

❌ Do not use string concatenation or template literals for conditional classes:
```tsx
// WRONG
<div className={`rounded-tb-card p-4 ${isActive ? 'border border-tb-border' : ''}`} />
```

## shadcn/ui components available

`button`, `badge`, `card`, `dialog`, `input`, `label`, `select`, `separator`, `sheet`, `skeleton`, `textarea`, `tooltip`

Import: `import { Button } from '@/components/ui/button'`
Install new: `npx shadcn add <name>` — never copy-paste source manually.

## Known Violations — Do Not Repeat

| File | Violation | Fix |
|---|---|---|
| `ProductListPage.tsx` | `text-[#52525B]` | `text-tb-muted` |
| `ProductListPage.tsx` | `bg-[#1C1C1E]` | `bg-tb-elevated` |
| `ProductListPage.tsx` | `border-[#27272A]` | `border-tb-border` |
| `LoginPage.tsx` | `bg-[#0B0B0E]` | `bg-tb-base` |
| `Avatar.tsx` | `style={{}}` with `--avatar-sz` / `--avatar-fs` | **DELIBERATE EXCEPTION** — dynamic sizing via CSS custom properties |

## Inline `style={{}}` — when allowed

Only one exception: `Avatar.tsx` uses CSS custom properties for dynamic size scaling.
Anywhere else, `style={{}}` is a violation flagged by `/check-tailwind`.
