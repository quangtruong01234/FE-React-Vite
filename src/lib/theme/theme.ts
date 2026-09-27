/**
 * THEME-03 — which theme the page shows (roadmap F13).
 *
 * The rule: the choice the user saved on this machine wins; with nothing saved, the OS
 * setting (`prefers-color-scheme`) decides. It runs twice — inline in `index.html` before
 * first paint, so the page never flashes the other palette, and here once React is up.
 * `theme.test.ts` executes the inline copy and checks it agrees with `resolveTheme`.
 */

export type Theme = 'light' | 'dark';

/**
 * Off in production until THEME-06 finishes the light theme, so real users never see it
 * half done. `index.html` carries the same gate (`'%DEV%'`) — THEME-06 lifts both.
 */
export const THEME_SWITCH_ENABLED: boolean = import.meta.env.DEV;

export const THEME_STORAGE_KEY = 'tb-theme';
export const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)';

/** `--bg-base` of each theme, for `<meta name="theme-color">` (the mobile browser bar). */
export const THEME_COLOR: Record<Theme, string> = { dark: '#09090B', light: '#FAFAFA' };

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function parseTheme(raw: string | null): Theme | null {
  return raw === 'light' || raw === 'dark' ? raw : null;
}

export function resolveTheme(saved: Theme | null, prefersLight: boolean): Theme {
  return saved ?? (prefersLight ? 'light' : 'dark');
}

/** Reading `window.localStorage` itself throws when site data is blocked. */
function browserStorage(): ThemeStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedTheme(storage: ThemeStorage | null = browserStorage()): Theme | null {
  try {
    return parseTheme(storage?.getItem(THEME_STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

/** `false` when the choice could not be saved — it still applies until the tab closes. */
export function writeSavedTheme(
  theme: Theme,
  storage: ThemeStorage | null = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

/** jsdom and very old browsers have no `matchMedia`; treat that as the dark default. */
export function prefersLightScheme(win: Pick<Window, 'matchMedia'> = window): boolean {
  return typeof win.matchMedia === 'function' && win.matchMedia(LIGHT_SCHEME_QUERY).matches;
}

export function applyTheme(theme: Theme, doc: Document = document): void {
  doc.documentElement.dataset.theme = theme;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}
