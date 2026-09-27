// Bundle budgets (PERF-BUDGET-01). Runs after `npm run build`:
//
//     npm run check:bundle
//
// Lighthouse CI (lighthouserc.json) only sees what /login downloads — the entry
// chunk. Every route-lazy chunk is invisible to it, so a heavy import landing in
// one of them (an editor, a chart library) would ship without a number moving.
// This reads dist/ instead and holds every emitted .js/.css to a gzip ceiling.
//
// Sizes are gzip (node's zlib default level), measured here rather than parsed
// from Vite's log, so the numbers are the same on every machine. Ceilings sit
// ~12–15% above the baseline measured 2026-09-25 — raise one deliberately, in
// the PR that justifies it, rather than muting the step.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUDGETS = {
  // The chunks index.html loads up front (react-dom + router + app shell).
  // Baseline: js 157 725 B, css 11 051 B.
  entryJs: 180_000,
  entryCss: 13_000,
  // Known heavy lazy chunks, keyed by the name Rollup gives them.
  named: {
    CreateProductPage: 170_000, // TipTap + ProseMirror — 148 485 B
    DoughnutChart: 72_000, // Chart.js, admin/shop analytics — 62 889 B
    cookieStore: 72_000, // MSW, loaded only in demo mode — 63 486 B
    schemas: 32_000, // react-hook-form + zod — 28 021 B
  },
  // Any other chunk. The largest today is 24 273 B, so a chunk that crosses this
  // is a new heavy dependency (or a renamed one above) — budget it on purpose.
  defaultChunk: 30_000,
  // Everything under dist/assets, .js + .css. Baseline: 653 351 B.
  total: 750_000,
};

/** 'CreateProductPage-B6eTWH-r.js' → 'CreateProductPage'. Vite hashes are 8 chars and may contain '-'. */
export function chunkName(file) {
  const match = /^(.+)-[\w-]{8}\.(?:js|css)$/.exec(file);
  return match ? match[1] : file;
}

/** The assets index.html references directly — `assets/index-DIGgaqad.js` → `index-DIGgaqad.js`. */
export function entryAssets(html) {
  return new Set([...html.matchAll(/assets\/([^"'?]+\.(?:js|css))/g)].map((m) => m[1]));
}

/**
 * Pure budget check. `assets` is `{ file, gzip }[]`; `entries` the file names
 * index.html loads. Returns one row per asset (largest first) plus the rows and
 * totals that broke their ceiling.
 */
export function evaluate(assets, entries, budgets = BUDGETS) {
  const rows = assets
    .map(({ file, gzip }) => {
      const name = chunkName(file);
      if (entries.has(file)) {
        const limit = file.endsWith('.css') ? budgets.entryCss : budgets.entryJs;
        return { file, name, gzip, limit, rule: 'entry' };
      }
      if (Object.hasOwn(budgets.named, name)) {
        return { file, name, gzip, limit: budgets.named[name], rule: 'named' };
      }
      return { file, name, gzip, limit: budgets.defaultChunk, rule: 'default' };
    })
    .sort((a, b) => b.gzip - a.gzip);

  const total = rows.reduce((sum, row) => sum + row.gzip, 0);
  return {
    rows,
    total,
    violations: rows.filter((row) => row.gzip > row.limit),
    totalExceeded: total > budgets.total,
  };
}

function format(bytes) {
  return bytes.toLocaleString('en-US').padStart(9);
}

function main() {
  const dist = 'dist';
  const assetsDir = join(dist, 'assets');
  if (!existsSync(assetsDir)) {
    console.error('check-bundle: dist/assets not found — run `npm run build` first.');
    process.exit(1);
  }

  const entries = entryAssets(readFileSync(join(dist, 'index.html'), 'utf8'));
  const assets = readdirSync(assetsDir)
    .filter((file) => /\.(?:js|css)$/.test(file))
    .map((file) => ({ file, gzip: gzipSync(readFileSync(join(assetsDir, file))).length }));
  const result = evaluate(assets, entries);

  console.log('gzip B   limit B   rule     chunk');
  for (const row of result.rows.slice(0, 12)) {
    console.log(`${format(row.gzip)} ${format(row.limit)}   ${row.rule.padEnd(8)} ${row.file}`);
  }
  console.log(`total ${format(result.total)} / ${format(BUDGETS.total)} across ${result.rows.length} files`);

  if (result.violations.length === 0 && !result.totalExceeded) {
    console.log('check-bundle: every chunk is within budget.');
    return;
  }
  for (const row of result.violations) {
    const hint = row.rule === 'default' ? ' — new heavy chunk: split it, or add it to BUDGETS.named' : '';
    console.error(`over budget: ${row.file} ${row.gzip} B > ${row.limit} B (${row.rule})${hint}`);
  }
  if (result.totalExceeded) {
    console.error(`over budget: total ${result.total} B > ${BUDGETS.total} B`);
  }
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
