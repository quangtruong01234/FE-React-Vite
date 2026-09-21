/**
 * Backend availability, decided once at app start.
 *
 * The gateway runs on EC2 inside a 14:00–19:00 ICT window to keep the hosting
 * bill at zero; the storefront itself is on Cloudflare Workers and is up 24/7.
 * Outside the window every request fails, and without this module the app looks
 * broken rather than parked: `ProtectedRoute` gets a failed `/user/me`, bounces
 * to `/login`, and the login POST fails too — a visitor sees a dead login form
 * and nothing else.
 *
 * So: probe once, and if the gateway is down, run the catalog off MSW fixtures
 * and say so in a banner. Writes are never mocked (see `handlers.ts`).
 */

export type BackendStatus = 'online' | 'offline';

/** Gateway health probe budget. Past this the backend counts as offline. */
export const HEALTH_PROBE_TIMEOUT_MS = 3000;

export const BACKEND_WINDOW_LABEL = '14:00–19:00 ICT (UTC+7)';

export const BACKEND_OFFLINE_NOTICE =
  `Backend is scheduled to run ${BACKEND_WINDOW_LABEL} to keep hosting cost near zero. ` +
  'Browse the catalog in demo mode, or read the 2-page demo guide.';

export const DEMO_GUIDE_URL =
  'https://github.com/quangtruong01234/FE-React-Vite/blob/main/docs/DEMO.md';

/** Shown on any control whose real behaviour needs a live backend. */
export const DEMO_DISABLED_LABEL = 'Available when backend is online';

/**
 * What a probe attempt means. Any non-2xx is treated the same as a thrown
 * request: a gateway that answers 502 is as unusable as one that never answers,
 * and both should land the visitor in demo mode rather than on a broken page.
 */
export function classifyProbe(response: { ok: boolean } | null): BackendStatus {
  return response?.ok === true ? 'online' : 'offline';
}

let current: BackendStatus = 'online';

export function setBackendStatus(next: BackendStatus): void {
  current = next;
}

export function getBackendStatus(): BackendStatus {
  return current;
}

/**
 * Read at render time rather than captured in state: the status is fixed before
 * the first render (`bootstrapBackendStatus` awaits the probe), so there is
 * nothing to subscribe to and no re-render to schedule.
 */
export function isDemoMode(): boolean {
  return current === 'offline';
}
