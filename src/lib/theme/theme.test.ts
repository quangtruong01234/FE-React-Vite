import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';
import css from '../../index.css?raw';
import { LIGHT_THEME, parseCustomProperties } from '@/test/themeTokens';
import {
  applyTheme,
  parseTheme,
  prefersLightScheme,
  readSavedTheme,
  resolveTheme,
  THEME_COLOR,
  THEME_STORAGE_KEY,
  type Theme,
  writeSavedTheme,
} from './theme';

type FakeStorage = Pick<Storage, 'getItem' | 'setItem'>;

function memoryStorage(initial: Record<string, string> = {}): FakeStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const throwingStorage: FakeStorage = {
  getItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
};

function blankDocument(): Document {
  const doc = document.implementation.createHTMLDocument('t');
  const meta = doc.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', THEME_COLOR.dark);
  doc.head.append(meta);
  return doc;
}

const mediaWindow = (matches: boolean): Pick<Window, 'matchMedia'> => ({
  matchMedia: () => ({ matches }) as MediaQueryList,
});

describe('resolveTheme', () => {
  it('lets a saved choice win over the OS setting', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', false)).toBe('light');
  });

  it('follows the OS setting when nothing is saved', () => {
    expect(resolveTheme(null, true)).toBe('light');
    expect(resolveTheme(null, false)).toBe('dark');
  });
});

describe('parseTheme', () => {
  it('accepts only the two theme names', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('Light')).toBeNull();
    expect(parseTheme('')).toBeNull();
    expect(parseTheme(null)).toBeNull();
  });
});

describe('readSavedTheme / writeSavedTheme', () => {
  it('round-trips a choice through storage', () => {
    const storage = memoryStorage();
    expect(writeSavedTheme('light', storage)).toBe(true);
    expect(storage.data[THEME_STORAGE_KEY]).toBe('light');
    expect(readSavedTheme(storage)).toBe('light');
  });

  it('ignores a value it did not write', () => {
    expect(readSavedTheme(memoryStorage({ [THEME_STORAGE_KEY]: 'sepia' }))).toBeNull();
  });

  it('survives storage that throws or is missing (private window, blocked site data)', () => {
    expect(readSavedTheme(throwingStorage)).toBeNull();
    expect(writeSavedTheme('light', throwingStorage)).toBe(false);
    expect(readSavedTheme(null)).toBeNull();
    expect(writeSavedTheme('light', null)).toBe(false);
  });
});

describe('prefersLightScheme', () => {
  it('reads the media query, and falls back to dark without matchMedia (jsdom)', () => {
    expect(prefersLightScheme(mediaWindow(true))).toBe(true);
    expect(prefersLightScheme(mediaWindow(false))).toBe(false);
    expect(prefersLightScheme({} as Pick<Window, 'matchMedia'>)).toBe(false);
  });
});

describe('applyTheme', () => {
  it('sets data-theme on <html> and repaints the browser bar colour', () => {
    const doc = blankDocument();
    applyTheme('light', doc);
    expect(doc.documentElement.dataset.theme).toBe('light');
    expect(doc.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#FAFAFA');
    applyTheme('dark', doc);
    expect(doc.documentElement.dataset.theme).toBe('dark');
    expect(doc.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#09090B');
  });
});

describe('THEME_COLOR', () => {
  const toHex = (channels: string | undefined): string =>
    `#${(channels ?? '')
      .split(' ')
      .map((c) => Number(c).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;

  it('matches --bg-base of each theme block in index.css', () => {
    expect(THEME_COLOR.dark).toBe(toHex(parseCustomProperties(css, ':root')['--bg-base']));
    expect(THEME_COLOR.light).toBe(toHex(parseCustomProperties(css, LIGHT_THEME)['--bg-base']));
  });
});

describe('the pre-paint script in index.html', () => {
  const inline = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!inline) throw new Error('index.html has no inline <script>');

  it('starts with the dark theme-color, before the script runs', () => {
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLOR.dark}" />`);
  });

  // What Vite writes into '%DEV%' in each mode.
  function runInline(
    isDev: boolean,
    storage: FakeStorage,
    prefersLight: boolean,
  ): { theme: string | undefined; color: string | null } {
    const doc = blankDocument();
    const code = (inline ?? '').replace("'%DEV%'", `'${String(isDev)}'`);
    new Function('localStorage', 'window', 'document', code)(storage, mediaWindow(prefersLight), doc);
    return {
      theme: doc.documentElement.dataset.theme,
      color: doc.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
    };
  }

  const saved: Array<Theme | null> = [null, 'light', 'dark'];
  for (const choice of saved) {
    for (const prefersLight of [false, true]) {
      it(`agrees with resolveTheme — saved ${String(choice)}, OS ${prefersLight ? 'light' : 'dark'}`, () => {
        const storage = memoryStorage(choice ? { [THEME_STORAGE_KEY]: choice } : {});
        const expected = resolveTheme(choice, prefersLight);
        expect(runInline(true, storage, prefersLight)).toEqual({ theme: expected, color: THEME_COLOR[expected] });
      });
    }
  }

  it('falls back to the OS setting when storage throws', () => {
    expect(runInline(true, throwingStorage, true)).toEqual({ theme: 'light', color: THEME_COLOR.light });
  });

  it('does nothing in a production build (the DEV gate, lifted in THEME-06)', () => {
    const storage = memoryStorage({ [THEME_STORAGE_KEY]: 'light' });
    expect(runInline(false, storage, true)).toEqual({ theme: undefined, color: THEME_COLOR.dark });
  });
});
