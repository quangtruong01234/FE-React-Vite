import { describe, expect, it } from 'vitest';
import css from '../index.css?raw';
import {
  type ColorConfig,
  contrastRatio,
  findColorLiteralsOutside,
  findHardcodedColors,
  findThemeBlockMismatches,
  findThemeTokenProblems,
  flattenColors,
  LIGHT_THEME,
  parseCustomProperties,
} from './themeTokens';

describe('flattenColors', () => {
  it('joins nested groups with a dash, the way Tailwind names the utilities', () => {
    expect(flattenColors({ canvas: { base: 'a', surface: 'b' }, bdr: 'c' })).toEqual({
      'canvas-base': 'a',
      'canvas-surface': 'b',
      bdr: 'c',
    });
  });

  it('maps DEFAULT to the group name itself', () => {
    expect(flattenColors({ ring: { DEFAULT: 'a', soft: 'b' } })).toEqual({ ring: 'a', 'ring-soft': 'b' });
  });
});

describe('parseCustomProperties', () => {
  const sample = `
    @tailwind utilities;
    :root {
      color: #fff;
      --bg-base: 9 9 11;   /* #09090B */
      /* --commented-out: 1 2 3; */
      --tb-bg: #09090B;
    }
    [data-theme='light'] { --bg-base: 250 250 250; }
  `;

  it('reads only the custom properties of the named block, ignoring comments', () => {
    expect(parseCustomProperties(sample, ':root')).toEqual({ '--bg-base': '9 9 11', '--tb-bg': '#09090B' });
  });

  it('reads a block whose selector has regex metacharacters', () => {
    expect(parseCustomProperties(sample, "[data-theme='light']")).toEqual({ '--bg-base': '250 250 250' });
  });

  it('returns nothing for a selector that is not in the file', () => {
    expect(parseCustomProperties(sample, '.dark')).toEqual({});
  });
});

describe('findThemeTokenProblems', () => {
  const variables = { '--ok': '9 9 11', '--hex': '#09090B' };

  it('accepts a channel-backed token', () => {
    expect(findThemeTokenProblems({ a: 'rgb(var(--ok) / <alpha-value>)' }, variables)).toEqual([]);
  });

  it('rejects the three shapes a theme cannot swap or /NN cannot modify', () => {
    expect(
      findThemeTokenProblems(
        { hex: '#F59E0B', bare: 'var(--ok)', opaque: 'rgb(var(--ok))' },
        variables,
      ),
    ).toHaveLength(3);
  });

  it('rejects a token whose variable is missing or holds a colour instead of channels', () => {
    expect(
      findThemeTokenProblems(
        { missing: 'rgb(var(--nope) / <alpha-value>)', hex: 'rgb(var(--hex) / <alpha-value>)' },
        variables,
      ),
    ).toEqual([
      'missing: --nope is not defined',
      'hex: --hex is `#09090B`, not bare RGB channels like `9 9 11`',
    ]);
  });
});

describe('findThemeBlockMismatches', () => {
  it('flags a variable missing on either side, and a channel that became a colour', () => {
    expect(
      findThemeBlockMismatches(
        { '--a': '1 2 3', '--b': '1 2 3', '--c': '#fff' },
        { '--a': '#010203', '--c': '#000', '--d': '1 2 3' },
      ),
    ).toEqual([
      '--a: `1 2 3` and `#010203` are not both RGB channels',
      '--b is missing from the theme',
      '--d is only in the theme, not in :root',
    ]);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG endpoints and a known pair', () => {
    expect(contrastRatio('255 255 255', '0 0 0')).toBeCloseTo(21, 5);
    expect(contrastRatio('9 9 11', '9 9 11')).toBe(1);
    // #F59E0B on white: the reason light amber text is #B45309 instead.
    expect(contrastRatio('245 158 11', '255 255 255')).toBeCloseTo(2.15, 2);
    expect(contrastRatio('255 255 255', '245 158 11')).toBe(contrastRatio('245 158 11', '255 255 255'));
  });
});

describe('findColorLiteralsOutside', () => {
  const sample = `
    :root { --a: #fff; color: rgb(var(--a)); }
    [data-theme="light"] { --a: rgba(0,0,0,0.1); }
    /* a comment may say #F59E0B */
    a { color: #F59E0B; background: rgb(var(--a) / 0.5); }
    b { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3); }
  `;

  it('finds literals only outside the allowed blocks, ignoring comments and rgb(var())', () => {
    expect(findColorLiteralsOutside(sample, [':root', '[data-theme="light"]'])).toEqual([
      '#F59E0B',
      'rgba(0, 0, 0, 0.3)',
    ]);
  });
});

describe('the real tailwind.config.js + index.css', () => {
  // `import.meta.glob` rather than a plain import: the config is untyped JS, and a plain
  // import of it fails `tsc` (TS7016) for everything under src/.
  const configs = import.meta.glob<{ theme: { extend: { colors: ColorConfig } } }>(
    '../../tailwind.config.js',
    { eager: true, import: 'default' },
  );
  const [config] = Object.values(configs);
  if (!config) throw new Error('tailwind.config.js was not found');
  const colors = flattenColors(config.theme.extend.colors);

  it('declares every colour token through a channel variable defined in :root', () => {
    expect(Object.keys(colors).length).toBeGreaterThan(20);
    expect(findThemeTokenProblems(colors, parseCustomProperties(css, ':root'))).toEqual([]);
  });

  it('keeps each tb-* token on the same variable as its semantic alias', () => {
    // Two names for one colour. If they drift onto different variables a theme repaints
    // half the UI — whichever half happened to use the other spelling.
    const pairs: Array<[string, string]> = [
      ['tb-base', 'canvas-base'],
      ['tb-surface', 'canvas-surface'],
      ['tb-elevated', 'canvas-elevated'],
      ['tb-border', 'bdr'],
      ['tb-amber', 'accent-amber'],
      ['tb-green', 'accent-green'],
      ['tb-red', 'accent-red'],
      ['tb-cyan', 'accent-cyan'],
      ['tb-muted', 'ink-muted'],
      ['tb-secondary', 'ink-sec'],
    ];
    for (const [tb, alias] of pairs) {
      expect(colors[tb], tb).toBe(colors[alias]);
    }
  });

  const dark = parseCustomProperties(css, ':root');
  const light = parseCustomProperties(css, LIGHT_THEME);
  const variableOf = (token: string): string => {
    const match = /var\((--[\w-]+)\)/.exec(colors[token] ?? '');
    if (!match) throw new Error(`${token} is not a colour token`);
    return match[1];
  };

  it('gives the light theme every variable :root has, in the same shape', () => {
    expect(Object.keys(light).length).toBeGreaterThan(20);
    expect(findThemeBlockMismatches(dark, light)).toEqual([]);
    expect(findThemeTokenProblems(colors, light)).toEqual([]);
  });

  it('keeps colour literals inside the two theme blocks', () => {
    expect(findColorLiteralsOutside(css, [':root', LIGHT_THEME])).toEqual([]);
  });

  it('keeps text on the gradient white in both themes (the gradient does not change)', () => {
    expect(dark['--text-on-accent']).toBe('255 255 255');
    expect(light['--text-on-accent']).toBe('255 255 255');
  });

  // Every text colour on every canvas colour — WCAG AA for normal-size text is 4.5:1.
  const texts = [
    'ink-pri', 'ink-sec', 'ink-muted',
    'accent-pri', 'accent-sec', 'accent-amber', 'accent-red',
    'accent-green', 'accent-cyan', 'accent-violet', 'accent-blue',
  ];
  const backgrounds = ['canvas-base', 'canvas-surface', 'canvas-elevated'];
  const failingPairs = (theme: Record<string, string>): string[] =>
    texts.flatMap((text) =>
      backgrounds
        .map((bg) => ({ bg, ratio: contrastRatio(theme[variableOf(text)], theme[variableOf(bg)]) }))
        .filter(({ ratio }) => ratio < 4.5)
        .map(({ bg, ratio }) => `${text} on ${bg}: ${ratio.toFixed(2)}`),
    );

  it('holds every light-theme text colour to WCAG AA on every canvas colour', () => {
    expect(failingPairs(light)).toEqual([]);
  });

  it('pins the dark-theme pairs that already miss AA, so the list cannot grow', () => {
    // Pre-existing in the dark palette (THEME-02 did not change it). Fixing one means
    // deleting its line here; a new failure fails this test.
    expect(failingPairs(dark)).toEqual([
      'ink-muted on canvas-base: 2.57',
      'ink-muted on canvas-surface: 2.44',
      'ink-muted on canvas-elevated: 2.20',
      'accent-violet on canvas-surface: 4.45',
      'accent-violet on canvas-elevated: 4.02',
    ]);
  });
});

describe('findHardcodedColors', () => {
  it('finds white/black utilities with any variant or opacity, and colour literals', () => {
    const sample = [
      `const a = 'text-white hover:bg-black/60 border-t-white';`,
      `const b = 'focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)] bg-[#111113]';`,
      `const c = { color: 'hsl(0 0% 100%)', fill: '#fff' };`,
    ].join('\n');
    expect(findHardcodedColors(sample)).toEqual([
      '1: text-white',
      '1: bg-black/60',
      '1: border-t-white',
      '2: rgba(245,158,11,0.10)',
      '2: #111113',
      '3: hsl(0 0% 100%)',
      '3: #fff',
    ]);
  });

  it('leaves tokens, comments, URLs and look-alike words alone', () => {
    const sample = [
      `const a = 'text-ink-on-accent bg-scrim/60 border-ink-on-accent/40 text-ink-pri';`,
      `// an old note: text-white, rgba(0,0,0,.5), #F59E0B`,
      `/* bg-black`,
      `   #09090B */ const url = 'https://example.com/#section';`,
      `const b = 'rgb(var(--accent-amber) / 0.5) whitespace-nowrap bg-white-ish tb-bg-black';`,
      `const c = '&#123; order #${'${id}'}';`,
    ].join('\n');
    expect(findHardcodedColors(sample)).toEqual([]);
  });
});

describe('src/ colour classes', () => {
  // Every theme-able file. Excluded: tests (they assert on colours), `components/ui/`
  // (write-blocked shadcn, its `bg-black/80` overlay reads fine in both themes),
  // `lib/chart/chartTheme.ts` (a canvas needs literal colours; one palette per theme,
  // pinned to index.css by chartTheme.test.ts — THEME-05), `lib/theme/theme.ts`
  // (`<meta name="theme-color">` needs a literal) and this folder.
  const sources = import.meta.glob<string>(
    [
      '../**/*.{ts,tsx}',
      '!../**/*.test.{ts,tsx}',
      '!../test/**',
      '!../components/ui/**',
      '!../lib/chart/chartTheme.ts',
      '!../lib/theme/theme.ts',
    ],
    { eager: true, query: '?raw', import: 'default' },
  );

  it('writes no colour a theme cannot swap (THEME-04)', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(300);
    const hits = Object.entries(sources).flatMap(([path, source]) =>
      findHardcodedColors(source).map((hit) => `${path.replace('../', 'src/')}:${hit}`),
    );
    expect(hits).toEqual([]);
  });
});
