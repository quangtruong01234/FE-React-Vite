# Design Tokens — TryBuy

Dark-theme design system. All tokens defined in `tailwind.config.ts`.
**Never hardcode hex/rgb values** — if a token doesn't exist, add it to the config first.

---

## Which System to Use

The project has **two complementary token layers**. They are not interchangeable for everything — read this section before writing new styling code.

### Semantic aliases — preferred for color in new code

`canvas-*` / `ink-*` / `accent-*` / `bdr` resolve through CSS variables and are the **preferred** choice for color in new code. They are more descriptive and future-proof for theming.

> ⚠️ **Opacity modifiers do NOT work on var()-based aliases.** `canvas-*`, `ink-*`,
> `accent-pri/sec/cyan/green/red/amber`, and `bdr` are plain `var()` strings without
> `<alpha-value>`, so `border-accent-amber/50` silently generates nothing (rings fall
> back to Tailwind's default blue). When you need `/50` or `/[0.08]`, use the
> literal-hex token instead: `tb-amber/50`, `tb-red/10`, or `accent-violet`/`accent-blue`
> (those two are literal hex). Verified live 2026-07-11.

Three colors exist **only** as semantic aliases — there is no `tb-*` equivalent:

| Token | Hex | Notes |
|---|---|---|
| `text-ink-pri` | `#FFFFFF` | The only correct token for white/primary text — `text-white` should not be used |
| `text-accent-cyan` | `#06b6d4` | Info highlights, chat, link accents |
| `text-accent-green` | `#10b981` | Success, free shipping, positive states |

### `tb-*` tokens — required for non-color tokens

`tb-*` tokens are the **only** system for these — semantic aliases do not cover them:

| Category | Tokens |
|---|---|
| Border-radius | `rounded-tb-pill/ghost/input/cta/card/sheet` |
| Gradients | `bg-tb-gradient`, `bg-tb-gradient-90`, `bg-login-left` |
| Shadows | `shadow-tb-cta`, `shadow-tb-card` |
| Animation classes | `tb-enter`, `tb-stagger`, `tb-pulse` (keyframe) |

For **color tokens** that have both a `tb-*` and a semantic alias, existing code uses both interchangeably. Prefer semantic aliases for new code; existing `tb-*` color usages are not violations.

### Semantic duplicates — intent matters

Two alias pairs resolve to identical hex values but carry different intent:

| Use this | Not this | Hex | When |
|---|---|---|---|
| `accent-pri` or `accent-amber` | (same) | `#F59E0B` | `accent-pri` for brand CTAs; `accent-amber` when the amber color itself is the intent (prices, highlights) |
| `accent-red` | `accent-sec` | `#EF4444` | `accent-red` for danger/destructive/error states; `accent-sec` for the brand secondary color role |

### Quick decision table

| What you're styling | Use |
|---|---|
| Page / card / input backgrounds | `bg-canvas-base` / `bg-canvas-surface` / `bg-canvas-elevated` |
| Borders | `border-bdr` |
| Primary text (white) | `text-ink-pri` |
| Secondary / muted text | `text-ink-sec` / `text-ink-muted` |
| Brand amber, CTAs, prices | `text-accent-amber` / `bg-accent-amber` |
| Danger / destructive | `text-accent-red` |
| Success, free shipping | `text-accent-green` ← alias-only, no `tb-*` |
| Info / cyan highlights | `text-accent-cyan` ← alias-only, no `tb-*` |
| Border-radius | `rounded-tb-*` ← `tb-*` only, no alias |
| Gradient fills | `bg-tb-gradient` / `bg-tb-gradient-90` ← `tb-*` only |
| Shadows | `shadow-tb-cta` / `shadow-tb-card` ← `tb-*` only |

---

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

| Token | Hex | `tb-*` equivalent |
|---|---|---|
| `bg-canvas-base` | `#09090B` | `bg-tb-base` |
| `bg-canvas-surface` | `#111113` | `bg-tb-surface` |
| `bg-canvas-elevated` | `#1C1C1E` | `bg-tb-elevated` |
| `border-bdr` | `#27272A` | `border-tb-border` |
| `text-ink-pri` | `#FFFFFF` | **none** — alias only |
| `text-ink-sec` | `#A1A1AA` | `text-tb-secondary` |
| `text-ink-muted` | `#52525B` | `text-tb-muted` |
| `text-accent-pri` | `#F59E0B` | `text-tb-amber` (same hex) |
| `text-accent-sec` | `#EF4444` | `text-tb-red` (same hex) |
| `text-accent-amber` | `#F59E0B` | `text-tb-amber` (same hex) |
| `text-accent-red` | `#EF4444` | `text-tb-red` (same hex) |
| `text-accent-cyan` | `#06b6d4` | **none** — alias only |
| `text-accent-green` | `#10b981` | **none** — alias only |
| `text-accent-violet` | `#8b5cf6` | **none** — alias only (shipped badge) |
| `text-accent-blue` | `#3b82f6` | **none** — alias only (delivering badge) |

### Badge pattern — `accent-*` tokens

```tsx
// bg-<token>/10  +  text-<token>  +  border-<token>/20
<span className="bg-accent-violet/10 text-accent-violet border border-accent-violet/20">Shipped</span>
<span className="bg-accent-blue/10 text-accent-blue border border-accent-blue/20">Delivering</span>
```

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
| `Avatar.tsx` | `style={{}}` with `--avatar-sz` / `--avatar-fs` | **DELIBERATE EXCEPTION** — dynamic sizing via CSS custom properties |

(`LoginPage.tsx` `bg-[#0B0B0E]` fixed → `bg-tb-base`, 2026-07-11.)

## Inline `style={{}}` — when allowed

Only one exception: `Avatar.tsx` uses CSS custom properties for dynamic size scaling.
Anywhere else, `style={{}}` is a violation flagged by `/check-tailwind`.
