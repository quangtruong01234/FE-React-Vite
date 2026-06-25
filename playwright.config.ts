import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for TryBuy frontend.
 *
 * Scenarios map 1:1 to `.ai/agent-handoff/e2e-payment-audit-2026-06-26.md`.
 * Prereqs to RUN:
 *   1. Vite dev server reachable at http://localhost:5173 (auto-started below).
 *   2. Backend reachable at http://localhost:3000 (Vite proxies /api → :3000).
 *      Specs tagged @needs-backend-write are blocked until the order/product
 *      write-path stops returning 502/503 (see BE-1..4 in the audit file).
 *   3. Test accounts seeded — see ../.agent-local/test-accounts.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Logs in once per role and persists cookies to e2e/.auth/*.json.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'buyer',
      testMatch: /.*\.buyer\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/buyer.json' },
    },
    {
      name: 'shop',
      testMatch: /.*\.shop\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/shop.json' },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
