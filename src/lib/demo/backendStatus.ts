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
 * Where the gateway actually serves its liveness check.
 *
 * NOT under `/api`. The gateway calls `setGlobalPrefix('api', { exclude: [...] })`
 * and `health` is on that exclude list, so the route is `GET /health` at the
 * root. Probing `/api/gateway/health` — which is what this used to do, and what
 * `.ai/context/backend-api.md` used to document — gets a 404 from a gateway that
 * is perfectly healthy, which `classifyProbe` then reads as offline: demo mode
 * switches on during the service window and login (deliberately unmocked) breaks
 * for real visitors.
 *
 * Because the path is outside `/api`, it only reaches the gateway if both proxies
 * forward it: `PROXY_PREFIXES` in `worker/proxy.ts` + `run_worker_first` in
 * wrangler.toml for production, and the `server.proxy` map in vite.config.ts for
 * dev. Drop it from either one and the request falls through to the SPA fallback
 * instead — see the content-type guard in `classifyProbe`.
 */
export const HEALTH_PROBE_PATH = '/health';

/** A probe attempt, reduced to the two fields the verdict depends on. */
export interface ProbeResult {
  ok: boolean;
  contentType: string | null;
}

/**
 * What a probe attempt means. Any non-2xx is treated the same as a thrown
 * request: a gateway that answers 502 is as unusable as one that never answers,
 * and both should land the visitor in demo mode rather than on a broken page.
 *
 * The content-type guard covers the opposite failure, which is the nastier one.
 * `HEALTH_PROBE_PATH` sits outside `/api`, so a proxy that is missing the entry
 * hands `/health` to the static assets — and `not_found_handling =
 * "single-page-application"` answers **200 with index.html**. On `ok` alone that
 * reads as a live gateway, and a real outage would render as a dead login form
 * instead of the demo banner. The gateway answers JSON; the SPA fallback cannot.
 */
export function classifyProbe(response: ProbeResult | null): BackendStatus {
  if (response?.ok !== true) return 'offline';
  return response.contentType?.includes('application/json') === true ? 'online' : 'offline';
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
