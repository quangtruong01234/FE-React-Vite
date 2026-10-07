import { defineConfig, devices, type Project } from '@playwright/test';

// Admin credentials live outside the tracked tree (see e2e/.env.example). Real
// env vars win; the file is optional, so a missing one is not an error.
try {
  process.loadEnvFile('e2e/.env.local');
} catch {
  // no local env file — the admin project is simply left out below
}
const hasAdmin = Boolean(process.env.E2E_ADMIN_USERNAME && process.env.E2E_ADMIN_PASSWORD);

// PERF-E2E-01: the perf project measures a production build on `vite preview`
// (:4173), so it only joins — and only builds — under `npm run test:perf`.
// Every other run keeps the single dev server and never pays for a build.
const perfRun = process.env.npm_lifecycle_event === 'test:perf';
const PERF_URL = 'http://localhost:4173';

const perfProjects: Project[] = perfRun
  ? [
      {
        name: 'perf',
        testMatch: /.*.perf.spec.ts/,
        dependencies: ['setup'],
        // Host-only cookies ignore the port, so the session saved on :5173 works here.
        use: { ...devices['Desktop Chrome'], baseURL: PERF_URL, storageState: 'e2e/.auth/buyer.json' },
      },
    ]
  : [];

const adminProjects: Project[] = hasAdmin
  ? [
      {
        name: 'admin',
        testMatch: /.*\.admin\.spec\.ts/,
        dependencies: ['setup'],
        use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      },
    ]
  : [];

/**
 * Playwright E2E config for TryBuy frontend.
 *
 * Two layers: `smoke.<role>.spec.ts` opens every route in e2e/routes.ts; the
 * other specs cover deep flows (payment audit 2026-06-26, auth session swap).
 * Projects: setup → buyer / shop / admin (admin only when E2E_ADMIN_* is set,
 * see e2e/.env.example) + public (signed out).
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
    ...adminProjects,
    ...perfProjects,
    // Signed-out checks (login page, auth gate). No storageState, no setup.
    {
      name: 'public',
      testMatch: /.*\.public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    // `vite preview` reuses `server.proxy`, so /api and /health still reach :3000.
    ...(perfRun
      ? [
          {
            command: 'npm run build && npm run preview -- --port 4173 --strictPort',
            url: PERF_URL,
            reuseExistingServer: false,
            timeout: 300_000,
          },
        ]
      : []),
  ],
});
