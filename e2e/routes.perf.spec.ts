import { test, expect, type Page } from '@playwright/test';
import { listOrders } from './api';

// PERF-E2E-01 — LCP / CLS / blocking time on the signed-in routes LHCI cannot
// reach (it only audits `/login`, signed out). Runs against `vite preview` on
// :4173 (a real production build); numbers from the Vite dev server are
// unbundled and mean nothing. Start it with `npm run test:perf`.
//
// Local numbers drift run to run, so the budgets are wide: this catches a big
// regression and records before/after for `/sweep` step 7c — it is not a
// substitute for RUM. Each route loads RUNS times; the median is judged.

const RUNS = 3;
const BUDGET = { lcpMs: 4000, cls: 0.1, blockingMs: 600 };

interface Vitals {
  lcpMs: number;
  cls: number;
  blockingMs: number;
}

declare global {
  interface Window {
    __vitals?: Vitals;
  }
}

// Installed before any app script. `blockingMs` sums the part of each long task
// past 50 ms — the same arithmetic as Lighthouse's TBT, over the whole load.
function installObservers(): void {
  const vitals: Vitals = { lcpMs: 0, cls: 0, blockingMs: 0 };
  window.__vitals = vitals;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) vitals.lcpMs = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
      if (!entry.hadRecentInput) vitals.cls += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) vitals.blockingMs += Math.max(0, entry.duration - 50);
  }).observe({ type: 'longtask', buffered: true });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function measure(page: Page, path: string): Promise<Vitals> {
  await page.goto(path);
  // socket.io keeps the network busy — networkidle is best-effort, then give
  // late layout shifts a moment to land before reading.
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
  expect(new URL(page.url()).pathname, 'redirected off the route').toBe(path);
  const vitals = await page.evaluate(() => window.__vitals);
  if (vitals === undefined) throw new Error('vitals observers were not installed');
  return vitals;
}

async function judge(page: Page, path: string): Promise<void> {
  await page.addInitScript(installObservers);
  const runs: Vitals[] = [];
  for (let i = 0; i < RUNS; i += 1) runs.push(await measure(page, path));

  const result: Vitals = {
    lcpMs: Math.round(median(runs.map((r) => r.lcpMs))),
    cls: Number(median(runs.map((r) => r.cls)).toFixed(3)),
    blockingMs: Math.round(median(runs.map((r) => r.blockingMs))),
  };
  // Surfaced in the list reporter and the HTML report, so 7c can copy the row.
  test.info().annotations.push({
    type: 'vitals',
    description: `${path} · LCP ${result.lcpMs}ms · CLS ${result.cls} · blocking ${result.blockingMs}ms (median of ${RUNS})`,
  });
  console.log(`[perf] ${path} LCP=${result.lcpMs}ms CLS=${result.cls} blocking=${result.blockingMs}ms runs=${JSON.stringify(runs)}`);

  expect.soft(result.lcpMs, 'LCP (ms)').toBeLessThanOrEqual(BUDGET.lcpMs);
  expect.soft(result.cls, 'CLS').toBeLessThanOrEqual(BUDGET.cls);
  expect.soft(result.blockingMs, 'blocking time (ms)').toBeLessThanOrEqual(BUDGET.blockingMs);
}

test.describe('perf · buyer', () => {
  for (const path of ['/marketplace', '/cart', '/checkout', '/orders']) {
    test(`${path} vitals`, async ({ page }) => {
      await judge(page, path);
    });
  }

  test('/order/:id vitals', async ({ page, request }) => {
    const id = (await listOrders(request))[0]?.id ?? null;
    test.skip(id === null, 'buyer has no order — seed one');
    if (id === null) return;
    await judge(page, `/order/${encodeURIComponent(id)}`);
  });
});

test.describe('perf · shop', () => {
  test.use({ storageState: 'e2e/.auth/shop.json' });

  test('/sell vitals', async ({ page }) => {
    await judge(page, '/sell');
  });
});
