/**
 * ALIAS-ALPHA-01 — detect opacity modifiers applied to `var()`-based color aliases.
 *
 * `canvas-*`, `ink-*`, `bdr` and `accent-{pri,sec,cyan,green,red,amber}` all resolve to
 * `var(--…)` in `tailwind.config.js`. Tailwind v3 needs an `<alpha-value>` placeholder to
 * inject alpha into a color, and a bare `var()` has none — so when it meets `/NN` it drops
 * **the whole class**. The failure is silent: `border-accent-amber/50` does not render a
 * faint border, it emits no declaration at all, so the element keeps whatever it had.
 *
 * Proven by measurement, not inference (`dist/assets/*.css` after `npm run build`):
 * `accent-amber\/50` → 0 hits, while `tb-amber\/50` → 4 and `accent-amber{` (no modifier)
 * → 4. The aliases are fine; only the modifier form is dead.
 *
 * `accent-violet` / `accent-blue` are hex literals, not `var()`, so `/NN` works on them —
 * they are deliberately absent from the pattern below.
 *
 * Rule source: `.ai/workflows/check-tailwind.md` Check 8.
 */

/** The `var()`-backed aliases, i.e. the ones where an opacity modifier is dead. */
const VAR_ALIASES = [
  'canvas-base',
  'canvas-surface',
  'canvas-elevated',
  'ink-pri',
  'ink-sec',
  'ink-muted',
  'bdr',
  'accent-pri',
  'accent-sec',
  'accent-cyan',
  'accent-green',
  'accent-red',
  'accent-amber',
] as const;

// The alias must follow a utility prefix (`bg-`, `border-`, `text-`, `ring-`, …) and be
// followed by `/<digits>`. Without the `/NN` lookahead a bare alias is valid CSS and must
// not be reported.
const ALIAS_ALPHA = new RegExp(`(?<=-)(?:${VAR_ALIASES.join('|')})/\\d+`, 'g');

/** Same color, but declared as a hex literal so the modifier survives. */
export const ALIAS_ALPHA_REPLACEMENT: Readonly<Record<string, string>> = {
  'canvas-base': 'tb-base',
  'canvas-surface': 'tb-surface',
  'canvas-elevated': 'tb-elevated',
  // #FFFFFF has no `tb-*` token; `white/NN` is the established form in this repo.
  'ink-pri': 'white',
  'ink-sec': 'tb-secondary',
  'ink-muted': 'tb-muted',
  bdr: 'tb-border',
  'accent-pri': 'tb-amber',
  'accent-sec': 'tb-red',
  'accent-cyan': 'tb-cyan',
  'accent-green': 'tb-green',
  'accent-red': 'tb-red',
  'accent-amber': 'tb-amber',
};

/**
 * Every dead alias-with-opacity token in `source`, in order, e.g. `['accent-amber/50']`.
 * Returns an empty array for source that is clean.
 */
export function findAliasAlphaViolations(source: string): string[] {
  return source.match(ALIAS_ALPHA) ?? [];
}

/** The `tb-*` (or `white`) class that should replace a violation `findAliasAlphaViolations` returned. */
export function suggestAliasAlphaFix(violation: string): string {
  const [alias, alpha] = violation.split('/');
  return `${ALIAS_ALPHA_REPLACEMENT[alias]}/${alpha}`;
}
