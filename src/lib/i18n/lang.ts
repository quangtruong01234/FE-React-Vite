/**
 * I18N-01 — which language the UI speaks (roadmap F14).
 *
 * The rule: the choice the user saved on this machine wins; with nothing saved the UI is
 * Vietnamese. `navigator.language` is deliberately ignored — the audience is Vietnamese, and
 * Playwright runs as `en-US` while every e2e spec asserts Vietnamese copy. It runs twice —
 * inline in `index.html` so `<html lang>` is right before first paint, and here once React is
 * up. `lang.test.ts` executes the inline copy and checks it agrees with `resolveLang`.
 */

export type Lang = 'vi' | 'en';

export const LANGS: readonly Lang[] = ['vi', 'en'];
export const DEFAULT_LANG: Lang = 'vi';
export const LANG_STORAGE_KEY = 'tb-lang';

/** BCP 47 locale for `Intl` / `toLocaleString` in each language. */
export const LANG_LOCALE: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US' };

type LangStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function parseLang(raw: string | null): Lang | null {
  return raw === 'vi' || raw === 'en' ? raw : null;
}

export function resolveLang(saved: Lang | null): Lang {
  return saved ?? DEFAULT_LANG;
}

/** Reading `window.localStorage` itself throws when site data is blocked. */
function browserStorage(): LangStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSavedLang(storage: LangStorage | null = browserStorage()): Lang | null {
  try {
    return storage ? parseLang(storage.getItem(LANG_STORAGE_KEY)) : null;
  } catch {
    return null;
  }
}

/** `false` when the choice could not be saved — it still applies until the tab closes. */
export function writeSavedLang(lang: Lang, storage: LangStorage | null = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(LANG_STORAGE_KEY, lang);
    return true;
  } catch {
    return false;
  }
}

export function applyLang(lang: Lang, doc: Document = document): void {
  doc.documentElement.lang = lang;
}
