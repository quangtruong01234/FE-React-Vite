import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';
import {
  applyLang,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  parseLang,
  readSavedLang,
  resolveLang,
  type Lang,
  writeSavedLang,
} from './lang';

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

describe('resolveLang', () => {
  it('lets a saved choice win, and is Vietnamese otherwise', () => {
    expect(resolveLang('en')).toBe('en');
    expect(resolveLang('vi')).toBe('vi');
    expect(resolveLang(null)).toBe('vi');
    expect(DEFAULT_LANG).toBe('vi');
  });
});

describe('parseLang', () => {
  it('accepts only the two language codes', () => {
    expect(parseLang('vi')).toBe('vi');
    expect(parseLang('en')).toBe('en');
    expect(parseLang('EN')).toBeNull();
    expect(parseLang('en-US')).toBeNull();
    expect(parseLang('')).toBeNull();
    expect(parseLang(null)).toBeNull();
  });
});

describe('readSavedLang / writeSavedLang', () => {
  it('round-trips a choice through storage', () => {
    const storage = memoryStorage();
    expect(writeSavedLang('en', storage)).toBe(true);
    expect(storage.data[LANG_STORAGE_KEY]).toBe('en');
    expect(readSavedLang(storage)).toBe('en');
  });

  it('ignores a value it did not write', () => {
    expect(readSavedLang(memoryStorage({ [LANG_STORAGE_KEY]: 'fr' }))).toBeNull();
  });

  it('survives storage that throws or is missing (private window, blocked site data)', () => {
    expect(readSavedLang(throwingStorage)).toBeNull();
    expect(writeSavedLang('en', throwingStorage)).toBe(false);
    expect(readSavedLang(null)).toBeNull();
    expect(writeSavedLang('en', null)).toBe(false);
  });
});

describe('applyLang', () => {
  it('sets lang on <html>', () => {
    const doc = document.implementation.createHTMLDocument('t');
    applyLang('en', doc);
    expect(doc.documentElement.lang).toBe('en');
    applyLang('vi', doc);
    expect(doc.documentElement.lang).toBe('vi');
  });
});

describe('the pre-paint lang script in index.html', () => {
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .find((body) => body?.includes(LANG_STORAGE_KEY));
  if (!inline) throw new Error(`index.html has no inline <script> reading ${LANG_STORAGE_KEY}`);

  it('starts as Vietnamese, before the script runs', () => {
    expect(html).toContain('<html lang="vi">');
  });

  function runInline(storage: FakeStorage): string {
    const doc = document.implementation.createHTMLDocument('t');
    new Function('localStorage', 'document', inline ?? '')(storage, doc);
    return doc.documentElement.lang;
  }

  const saved: Array<Lang | 'fr' | null> = [null, 'vi', 'en', 'fr'];
  for (const choice of saved) {
    it(`agrees with resolveLang — saved ${String(choice)}`, () => {
      const storage = memoryStorage(choice ? { [LANG_STORAGE_KEY]: choice } : {});
      expect(runInline(storage)).toBe(resolveLang(readSavedLang(storage)));
    });
  }

  it('falls back to Vietnamese when storage throws', () => {
    expect(runInline(throwingStorage)).toBe('vi');
  });

  it('runs the same in every build — no Vite env placeholder', () => {
    expect(inline).not.toMatch(/%[A-Z_]+%/);
  });
});
