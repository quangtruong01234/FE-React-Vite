// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { chunkName, entryAssets, evaluate } from './check-bundle.mjs';

const BUDGETS = {
  entryJs: 100,
  entryCss: 10,
  named: { CreateProductPage: 80 },
  defaultChunk: 20,
  total: 200,
};

describe('chunkName', () => {
  it('strips the 8-char hash, including a hash that contains a dash', () => {
    expect(chunkName('CreateProductPage-B6eTWH-r.js')).toBe('CreateProductPage');
    expect(chunkName('voucherConsoleBinding-BOCrvc9k.js')).toBe('voucherConsoleBinding');
    expect(chunkName('index-D1oBM2Il.css')).toBe('index');
  });

  it('returns the file unchanged when it carries no hash', () => {
    expect(chunkName('favicon.js')).toBe('favicon.js');
  });
});

describe('entryAssets', () => {
  it('collects the js and css index.html loads, not other assets', () => {
    const html =
      '<script type="module" crossorigin src="/assets/index-DIGgaqad.js"></script>' +
      '<link rel="stylesheet" crossorigin href="/assets/index-D1oBM2Il.css">' +
      '<link rel="icon" href="/assets/logo-abcdefgh.svg">';
    expect(entryAssets(html)).toEqual(new Set(['index-DIGgaqad.js', 'index-D1oBM2Il.css']));
  });
});

describe('evaluate', () => {
  const entries = new Set(['index-AAAAAAAA.js', 'index-BBBBBBBB.css']);

  it('passes when every chunk and the total are within budget', () => {
    const result = evaluate(
      [
        { file: 'index-AAAAAAAA.js', gzip: 90 },
        { file: 'index-BBBBBBBB.css', gzip: 5 },
        { file: 'CreateProductPage-CCCCCCCC.js', gzip: 70 },
      ],
      entries,
      BUDGETS,
    );
    expect(result.violations).toEqual([]);
    expect(result.totalExceeded).toBe(false);
    expect(result.rows.map((row) => row.gzip)).toEqual([90, 70, 5]);
  });

  it('holds the entry to the entry budget even when a lazy chunk shares its name', () => {
    // Rollup can emit a second `index-*.js` for a shared module; only the one
    // index.html loads is the entry.
    const result = evaluate(
      [
        { file: 'index-AAAAAAAA.js', gzip: 95 },
        { file: 'index-DDDDDDDD.js', gzip: 25 },
      ],
      entries,
      BUDGETS,
    );
    expect(result.violations.map((row) => [row.file, row.rule])).toEqual([
      ['index-DDDDDDDD.js', 'default'],
    ]);
  });

  it('flags a named chunk over its own ceiling, not the default one', () => {
    const result = evaluate([{ file: 'CreateProductPage-CCCCCCCC.js', gzip: 81 }], entries, BUDGETS);
    expect(result.violations).toEqual([
      { file: 'CreateProductPage-CCCCCCCC.js', name: 'CreateProductPage', gzip: 81, limit: 80, rule: 'named' },
    ]);
  });

  it('flags an unbudgeted chunk that crosses the default ceiling', () => {
    const result = evaluate([{ file: 'newEditor-EEEEEEEE.js', gzip: 21 }], entries, BUDGETS);
    expect(result.violations.map((row) => row.rule)).toEqual(['default']);
  });

  it('flags the total even when each chunk is within budget', () => {
    const result = evaluate(
      [
        { file: 'index-AAAAAAAA.js', gzip: 100 },
        { file: 'CreateProductPage-CCCCCCCC.js', gzip: 80 },
        { file: 'a-FFFFFFFF.js', gzip: 20 },
        { file: 'b-GGGGGGGG.js', gzip: 20 },
      ],
      entries,
      BUDGETS,
    );
    expect(result.violations).toEqual([]);
    expect(result.total).toBe(220);
    expect(result.totalExceeded).toBe(true);
  });
});
