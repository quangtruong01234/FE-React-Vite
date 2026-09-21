import { setBackendStatus, type BackendStatus } from './backendStatus';
import { probeBackend } from './probeBackend';

/**
 * Decide online/offline before the first render, and stand up the demo-mode
 * mocks if the gateway is away.
 *
 * Ordering is the whole point: the service worker has to be intercepting before
 * React mounts, or `ProtectedRoute` fires `/user/me` at the dead gateway and
 * redirects to `/login` in the gap. That costs one round-trip on every cold
 * load — a few milliseconds against a live gateway, and at most
 * `HEALTH_PROBE_TIMEOUT_MS` against a dead one, which is a load that was going
 * to fail anyway.
 *
 * MSW is imported dynamically so its worker code lands in its own chunk and is
 * never fetched during the (normal) online path.
 */
export async function bootstrapBackendStatus(): Promise<BackendStatus> {
  const status = await probeBackend();
  setBackendStatus(status);

  if (status === 'offline') {
    try {
      const [{ setupWorker }, { demoHandlers }] = await Promise.all([
        import('msw/browser'),
        import('./handlers'),
      ]);
      await setupWorker(...demoHandlers).start({
        quiet: true,
        // Only `/api` traffic is mocked; the app's own assets must pass through.
        onUnhandledRequest: 'bypass',
        serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      });
    } catch (error: unknown) {
      // No service worker (unsupported browser, or the script failed to
      // register) — the catalog stays unavailable, but the banner still
      // explains why, which is the half that matters most.
      console.warn('[demo mode] mocks unavailable:', error);
    }
  }

  return status;
}
