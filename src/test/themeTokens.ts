/**
 * THEME-01 — every Tailwind colour token must be swappable by a theme.
 *
 * A token is swappable when `tailwind.config.js` declares it as
 * `rgb(var(--x) / <alpha-value>)` and `src/index.css` defines `--x` as bare RGB channels
 * (`9 9 11`). A theme then only redefines the variables; no class in `src/` changes.
 *
 * The same shape is what makes `/NN` opacity work. Tailwind v3 injects alpha through the
 * `<alpha-value>` placeholder; a colour without one (a bare `var(--x)`) drops **the whole
 * class** when it meets a modifier — that silently killed 265 classes before ALIAS-ALPHA-01.
 * A hex literal keeps `/NN` working but a theme cannot reach it.
 */
import escapeRegExp from 'lodash/escapeRegExp';

/** Tailwind's `theme.colors` shape: a colour string, or a group of named colours. */
export type ColorConfig = { [name: string]: string | ColorConfig };

const CHANNEL_COLOR = /^rgb\(var\((--[\w-]+)\) \/ <alpha-value>\)$/;
const CHANNEL = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)';
const RGB_CHANNELS = new RegExp(`^${CHANNEL} ${CHANNEL} ${CHANNEL}$`);

/** `{ canvas: { base: … } }` → `{ 'canvas-base': … }`, the names the utilities use. */
export function flattenColors(colors: ColorConfig, prefix = ''): Record<string, string> {
  return Object.entries(colors).reduce<Record<string, string>>((flat, [key, value]) => {
    const name = key === 'DEFAULT' ? prefix : prefix ? `${prefix}-${key}` : key;
    return typeof value === 'string'
      ? { ...flat, [name]: value }
      : { ...flat, ...flattenColors(value, name) };
  }, {});
}

/** The `--x: value` declarations of the first `selector { … }` block in `css`. */
export function parseCustomProperties(css: string, selector: string): Record<string, string> {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // The selector must open a rule: at the start, or after a rule (`}`) or an at-rule (`;`).
  const block = new RegExp(`(?:^|[;}])\\s*${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`).exec(uncommented);
  if (!block) return {};
  return Object.fromEntries(
    [...block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

/** One line per token a theme cannot swap; empty when every token is channel-backed. */
export function findThemeTokenProblems(
  colors: Record<string, string>,
  variables: Record<string, string>,
): string[] {
  return Object.entries(colors).flatMap(([token, value]) => {
    const match = CHANNEL_COLOR.exec(value);
    if (!match) return [`${token}: \`${value}\` is not rgb(var(--x) / <alpha-value>)`];
    const channels = variables[match[1]];
    if (channels === undefined) return [`${token}: ${match[1]} is not defined`];
    if (!RGB_CHANNELS.test(channels)) {
      return [`${token}: ${match[1]} is \`${channels}\`, not bare RGB channels like \`9 9 11\``];
    }
    return [];
  });
}

/** The selector of the light theme block in src/index.css (THEME-02). */
export const LIGHT_THEME = '[data-theme="light"]';

/**
 * Variables one theme block defines and the other does not, plus variables that are bare
 * channels in one block but not the other. A theme missing a variable silently inherits the
 * dark value — dark text on a dark-for-light background.
 */
export function findThemeBlockMismatches(
  base: Record<string, string>,
  theme: Record<string, string>,
): string[] {
  const names = [...new Set([...Object.keys(base), ...Object.keys(theme)])].sort();
  return names.flatMap((name) => {
    if (!(name in theme)) return [`${name} is missing from the theme`];
    if (!(name in base)) return [`${name} is only in the theme, not in :root`];
    if (RGB_CHANNELS.test(base[name]) !== RGB_CHANNELS.test(theme[name])) {
      return [`${name}: \`${base[name]}\` and \`${theme[name]}\` are not both RGB channels`];
    }
    return [];
  });
}

function relativeLuminance(channels: string): number {
  const [r, g, b] = channels.split(' ').map((value) => {
    const c = Number(value) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio (1–21) of two bare-channel colours like `9 9 11`. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Colour literals (`#hex`, `rgb(`/`rgba(` not wrapping a `var()`) outside the named blocks.
 * Theme blocks are where colours live; every other rule must read them through a variable,
 * or it stays one colour whichever theme is on.
 */
export function findColorLiteralsOutside(css: string, selectors: string[]): string[] {
  const uncommented = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rest = selectors.reduce(
    (text, selector) =>
      text.replace(new RegExp(`(^|[;}])\\s*${escapeRegExp(selector)}\\s*\\{[^}]*\\}`), '$1'),
    uncommented,
  );
  return rest.match(/#[0-9a-fA-F]{3,8}\b|rgba?\((?!var\()[^)]*\)/g) ?? [];
}

/**
 * THEME-04 — a colour a theme cannot reach, written straight into a `.ts`/`.tsx` file:
 * a `white`/`black` utility (`text-white`, `hover:bg-black/60`), an `rgb()`/`rgba()`/`hsl()`
 * literal, or a hex. Comments are skipped; each hit is `line: match`.
 *
 * Text on the gradient, a solid accent, a photo or a scrim is `ink-on-accent`; overlays are
 * `scrim`; everything else is an `ink-*` / `canvas-*` / `accent-*` token.
 */
export function findHardcodedColors(source: string): string[] {
  const blankComment = (comment: string): string => comment.replace(/[^\n]/g, ' ');
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, blankComment)
    // A line comment starts the line or follows whitespace — `https://…` inside a string does not.
    .replace(/(^|\s)\/\/[^\n]*/g, (comment, lead: string) => lead + blankComment(comment.slice(lead.length)));
  const utility =
    /(?<![\w-])(?:text|bg|border(?:-[trblxy])?|ring(?:-offset)?|from|via|to|fill|stroke|outline|divide|placeholder|shadow|caret|decoration|accent)-(?:white|black)(?:\/\d+)?(?![\w-])/;
  const literal = /(?:rgba?|hsla?)\(\s*\d[^)]*\)/;
  const hex = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/;
  const pattern = new RegExp([utility, literal, hex].map((part) => part.source).join('|'), 'g');
  return code
    .split('\n')
    .flatMap((line, index) => [...line.matchAll(pattern)].map(([match]) => `${index + 1}: ${match}`));
}
