# Design Tokens — TryBuy

Dark-theme design system; a light palette exists since THEME-02 (`[data-theme="light"]` in
`src/index.css`). Since THEME-03 `ThemeProvider` sets `data-theme` on `<html>` (saved choice →
OS `prefers-color-scheme`), but only in **dev** until THEME-06 (roadmap F13) — production stays
dark. All tokens defined in `tailwind.config.js`.
**Never hardcode hex/rgb values** — if a token doesn't exist, add it to the config first.
A new **colour** token is two lines: a bare-RGB channel variable in `src/index.css` `:root`
(`--x: 9 9 11;`) and `channel('--x')` in the config. `src/test/themeTokens.test.ts` fails on
any other shape (hex, bare `var()`), because a theme could not swap it. **Also add the variable to
the `[data-theme="light"]` block** — the test fails if a `:root` variable is missing there, and a
light text colour must reach WCAG AA (4.5:1) on all three canvases. Colour literals belong only
in those two blocks; every other rule in `index.css` reads `rgb(var(--x))`.

---

## Which System to Use

The project has **two complementary token layers**. They are not interchangeable for everything — read this section before writing new styling code.

### Semantic aliases — preferred for color in new code

`canvas-*` / `ink-*` / `accent-*` / `bdr` resolve through CSS variables and are the **preferred** choice for color in new code. They are more descriptive and future-proof for theming.

> ✅ **Opacity modifiers work on every colour token** (since THEME-01, 2026-09-25). Each alias
> and each `tb-*` colour is `rgb(var(--x) / <alpha-value>)` over a channel variable, so
> `border-accent-amber/50`, `bg-canvas-surface/95` and `bg-tb-amber/[0.08]` all compile.
> Before THEME-01 the aliases were bare `var()` and `/NN` dropped the **whole class** — code
> from that era spells opacity with `tb-*`; that is not a violation and needs no rewrite.

`text-ink-pri` exists **only** as a semantic alias — it is the primary text colour (white in dark,
near-black in light). `text-white`, `bg-black`, `white/N`, `black/N`, `rgb()`/`rgba()` and hex are
banned in `src/`: a theme cannot reach them, and `src/test/themeTokens.test.ts` fails on each one
with `file:line` (THEME-04).

Amber, red, green, and cyan each also have a `tb-*` name (`tb-amber`, `tb-red`, `tb-green`,
`tb-cyan`). It reads the **same variable** as the alias (the guard test pins each pair), so both
spellings take `/NN`; prefer the semantic alias (`text-accent-*`, `bg-accent-green/15`) in new code.

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
| Success, free shipping | `text-accent-green` |
| Info / cyan highlights | `text-accent-cyan` |
| Border-radius | `rounded-tb-*` ← `tb-*` only, no alias |
| Gradient fills | `bg-tb-gradient` / `bg-tb-gradient-90` ← `tb-*` only |
| Shadows | `shadow-tb-cta` / `shadow-tb-card` ← `tb-*` only |

---

## Color Tokens — `tb-*`

Hex columns below are the **dark-theme** values. The source of truth is the channel variable in
`src/index.css` (`--bg-base: 9 9 11; /* #09090B */`); a theme redefines the variable, not the class.

| Token | Hex | Use for |
|---|---|---|
| `bg-tb-base` | `#09090B` | Page background |
| `bg-tb-surface` | `#111113` | Cards, panels |
| `bg-tb-elevated` | `#1C1C1E` | Inputs, elevated surfaces |
| `border-tb-border` | `#27272A` | Borders |
| `text-tb-muted` | `#52525B` | Placeholder, disabled text |
| `text-tb-secondary` | `#A1A1AA` | Secondary text |
| `text-tb-amber` | `#F59E0B` | Accent amber |
| `text-tb-green` | `#10B981` | Success green |
| `text-tb-red` | `#EF4444` | Danger / accent red |
| `text-tb-cyan` | `#06B6D4` | Info / cyan |

## CSS-Variable Semantic Aliases

| Token | Hex (dark) | Hex (light) | `tb-*` equivalent |
|---|---|---|---|
| `bg-canvas-base` | `#09090B` | `#FAFAFA` | `bg-tb-base` |
| `bg-canvas-surface` | `#111113` | `#FFFFFF` | `bg-tb-surface` |
| `bg-canvas-elevated` | `#1C1C1E` | `#F4F4F5` | `bg-tb-elevated` |
| `border-bdr` | `#27272A` | `#E4E4E7` | `border-tb-border` |
| `text-ink-pri` | `#FFFFFF` | `#09090B` | **none** — alias only |
| `text-ink-sec` | `#A1A1AA` | `#52525B` | `text-tb-secondary` |
| `text-ink-muted` | `#52525B` | `#6B6B73` | `text-tb-muted` |
| `text-accent-pri` | `#F59E0B` | `#B45309` | `text-tb-amber` (same hex) |
| `text-accent-sec` | `#EF4444` | `#B91C1C` | `text-tb-red` (same hex) |
| `text-accent-amber` | `#F59E0B` | `#B45309` | `text-tb-amber` (same hex) |
| `text-accent-red` | `#EF4444` | `#B91C1C` | `text-tb-red` (same hex) |
| `text-accent-cyan` | `#06b6d4` | `#0E7490` | `text-tb-cyan` |
| `text-accent-green` | `#10b981` | `#047857` | `text-tb-green` |
| `text-accent-violet` | `#8b5cf6` | `#7C3AED` | **none** — alias only (shipped badge) |
| `text-accent-blue` | `#3b82f6` | `#2563EB` | **none** — alias only (delivering badge) |
| `text-ink-on-accent` | `#FFFFFF` | `#FFFFFF` | **none** — text on the CTA gradient or a photo; white in every theme |
| `bg-scrim` | `#000000` | `#18181B` | **none** — modal/drawer overlay; set opacity per use (`bg-scrim/60`) |

> `ink-pri` flips to near-black in light mode. Text sitting on `bg-tb-gradient`, a solid accent
> (`bg-accent-red`), an image or a scrim must use `text-ink-on-accent`, not `ink-pri` or
> `text-white`. Overlays and letterboxes behind media are `bg-scrim/NN`, not `bg-black/NN`.
> Since THEME-04, `src/` has none of the old spellings left.

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
| `bg-login-left` | Radial amber+red glow for auth page — reads `--tb-login-glow`, softer in light mode |

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
| `shadow-tb-cta` | Amber glow on primary CTAs — same in both themes |
| `shadow-tb-card` | Card / popover elevation — `--tb-shadow-card`, a soft grey shadow in light mode |

Both read a CSS variable (`var(--tb-shadow-*)`), so a theme swaps them without touching a class.

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

`cn()` from `lib/format/utils.ts` wraps `clsx` + `tailwind-merge`. Always use for conditional classes.

```tsx
import { cn } from '@/lib/format/utils';

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

## Hardcoded hex — current state

`src/` has **zero** hardcoded hex (`[#...]`) as of 2026-08-03. Any new one is a 🔴 violation —
map it through the table above.

## Inline `style={{}}` — when allowed

Only for a value that genuinely cannot be a static utility class (runtime-computed size or
percentage). A chart colour is not one: canvas colours come from `useChartPalette()`, and a legend
dot uses the token class from `CHART_DOT_CLASS`. Preferred form is a CSS custom property + an arbitrary-value
class, e.g. `style={{ '--p': \`${percent}%\` } as CSSProperties}` + `className="[width:var(--p)]"`.
Everything else is a violation flagged by `/check-tailwind` — see that workflow's Check 1 for
the current allow-list.
