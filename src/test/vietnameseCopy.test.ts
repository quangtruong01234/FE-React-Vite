import { describe, expect, it } from 'vitest';
import { findVietnameseLiterals, hasVietnamese } from './vietnameseCopy';

describe('hasVietnamese', () => {
  it('spots tone marks, shaped vowels and đ', () => {
    expect(hasVietnamese('Đặt hàng')).toBe(true);
    expect(hasVietnamese('giỏ')).toBe(true);
    expect(hasVietnamese('100 đ')).toBe(true);
  });

  it('leaves plain ASCII and the multiplication sign alone', () => {
    expect(hasVietnamese('Place order')).toBe(false);
    expect(hasVietnamese('×2')).toBe(false);
  });
});

describe('findVietnameseLiterals', () => {
  it('reports strings, template text and JSX text with their line', () => {
    const source = [
      "const a = 'Xin chào';",
      'const b = `Tối đa ${n} ảnh`;',
      'const c = <p>Giỏ hàng</p>;',
    ].join('\n');
    expect(findVietnameseLiterals(source, 'x.tsx')).toEqual([
      '1: Xin chào',
      '2: Tối đa',
      '2: ảnh',
      '3: Giỏ hàng',
    ]);
  });

  it('ignores comments, regex literals and defineMessages books', () => {
    const source = [
      '// Giỏ hàng',
      '/* Đặt hàng */',
      "const fold = s.replace(/đ/g, 'd');",
      "const book = defineMessages({ vi: { cart: 'Giỏ hàng' }, en: { cart: 'Cart' } });",
    ].join('\n');
    expect(findVietnameseLiterals(source, 'x.ts')).toEqual([]);
  });
});

/**
 * Files that may still hold Vietnamese literals, with how many and why. Anything else
 * that writes Vietnamese straight into a `.ts`/`.tsx` fails the scan below: the copy
 * belongs in a `*.i18n.ts` book so the English UI can translate it (F14). The count is
 * exact so a stale entry fails too.
 */
const ALLOWED: Record<string, { count: number; reason: string }> = {
  'src/components/shared/LanguageSwitch.tsx': {
    count: 1,
    reason: "the language's own name, 'Tiếng Việt', is shown in Vietnamese in both UIs",
  },
  'src/lib/auth/roleLabels.ts': {
    count: 8,
    reason: 'already bilingual: the vi half of a `Record<Lang, …>` and of an `if (lang === "en")` branch',
  },
  'src/lib/date/calendar.ts': {
    count: 1,
    reason: 'already bilingual: the vi branch of the month-title ternary',
  },
  'src/lib/demo/fixtures.ts': {
    count: 6,
    reason: 'demo-mode backend data (payment methods, categories) — data, not UI copy',
  },
};

describe('no Vietnamese copy outside the message books (I18N-07)', () => {
  const sources = import.meta.glob<string>(
    ['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../**/*.i18n.ts', '!../test/**'],
    { eager: true, query: '?raw', import: 'default' },
  );

  it('keeps every Vietnamese literal in a *.i18n.ts book or on the allowlist', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(300);
    const counts: Record<string, number> = {};
    const strays: string[] = [];
    for (const [path, source] of Object.entries(sources)) {
      const file = path.replace('../', 'src/');
      const hits = findVietnameseLiterals(source, file);
      if (hits.length === 0) continue;
      counts[file] = hits.length;
      if (!ALLOWED[file]) strays.push(...hits.map((hit) => `${file}:${hit}`));
    }
    expect(strays).toEqual([]);
    const allowedCounts = Object.fromEntries(
      Object.entries(ALLOWED).map(([file, { count }]) => [file, count]),
    );
    expect(counts).toEqual(allowedCounts);
  });
});
