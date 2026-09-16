import { describe, expect, it } from 'vitest';
import {
  ALIAS_ALPHA_REPLACEMENT,
  findAliasAlphaViolations,
  suggestAliasAlphaFix,
} from './aliasAlpha';

describe('findAliasAlphaViolations', () => {
  it('flags an opacity modifier on every var()-backed alias', () => {
    for (const alias of Object.keys(ALIAS_ALPHA_REPLACEMENT)) {
      expect(findAliasAlphaViolations(`bg-${alias}/50`)).toEqual([`${alias}/50`]);
    }
  });

  it('leaves a bare alias alone — without a modifier the class is emitted normally', () => {
    expect(findAliasAlphaViolations('text-accent-amber bg-canvas-surface border-bdr')).toEqual([]);
  });

  it('leaves accent-violet and accent-blue alone — they are hex literals, so /NN works', () => {
    expect(findAliasAlphaViolations('bg-accent-violet/20 text-accent-blue/10')).toEqual([]);
  });

  it('leaves tb-* tokens alone — they are the fix, not the violation', () => {
    expect(findAliasAlphaViolations('bg-tb-amber/50 border-tb-red/10 text-white/70')).toEqual([]);
  });

  it('finds violations behind a variant prefix and reports each one', () => {
    expect(
      findAliasAlphaViolations('hover:border-accent-amber/50 focus:ring-accent-red/30'),
    ).toEqual(['accent-amber/50', 'accent-red/30']);
  });

  it('suggests the same color as a hex-literal token, preserving the alpha step', () => {
    expect(suggestAliasAlphaFix('accent-amber/50')).toBe('tb-amber/50');
    expect(suggestAliasAlphaFix('canvas-elevated/90')).toBe('tb-elevated/90');
    expect(suggestAliasAlphaFix('bdr/60')).toBe('tb-border/60');
    // #FFFFFF has no tb-* token.
    expect(suggestAliasAlphaFix('ink-pri/70')).toBe('white/70');
  });
});

describe('src/ is free of dead alias-with-opacity classes', () => {
  // A whole-repo guard, not a spot check: ALIAS-ALPHA-01 cleared 265 of these across 56
  // files, and nothing in `npm run build` or `npm run lint` fails when one comes back —
  // the class simply stops existing and the UI quietly loses a border or a tint.
  it('has no `<var()-alias>/NN` anywhere in src/', () => {
    // `import.meta.glob` rather than node:fs — nothing in `src/` may depend on node types,
    // and vite already hands us every file's source here.
    const sources = import.meta.glob('../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    // This rule's own two files carry violations as fixtures and documentation.
    const files = Object.entries(sources).filter(([path]) => !/aliasAlpha\.(test\.)?ts$/.test(path));
    expect(files.length).toBeGreaterThan(100);

    const offenders = files.flatMap(([path, source]) =>
      findAliasAlphaViolations(source).map((v) => `${path}: ${v} → use ${suggestAliasAlphaFix(v)}`),
    );

    expect(offenders).toEqual([]);
  });
});
