import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/test/msw/server';
import { probeBackend } from './probeBackend';
import { HEALTH_PROBE_PATH } from './backendStatus';

// Not `${API_BASE}/...`: the gateway excludes `health` from its global `api`
// prefix, so the route is at the root. Probing under /api got a 404 from a
// healthy gateway and sent real visitors into demo mode.
const HEALTH = HEALTH_PROBE_PATH;

describe('probeBackend', () => {
  it('probes the root /health route, not one under /api', async () => {
    server.use(
      http.get('/api/gateway/health', () => HttpResponse.json({ status: 'ok' })),
      http.get(HEALTH, () => HttpResponse.json({ status: 'ok' })),
    );

    await expect(probeBackend()).resolves.toBe('online');
    // The /api spelling is a 404 in production; if the probe ever moves back
    // under the prefix this stays green, so assert the path directly too.
    expect(HEALTH_PROBE_PATH.startsWith('/api')).toBe(false);
  });

  it('reports online when the gateway answers 200', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json({ status: 'ok' })));

    await expect(probeBackend()).resolves.toBe('online');
  });

  it('reports offline when a 200 is not JSON', async () => {
    // What an unproxied /health actually returns: the Worker (and vite) hand it
    // to the static assets, and the SPA fallback answers 200 with index.html.
    // Without the content-type check that reads as a live gateway.
    server.use(
      http.get(HEALTH, () =>
        HttpResponse.html('<!doctype html><html><body>SPA</body></html>'),
      ),
    );

    await expect(probeBackend()).resolves.toBe('offline');
  });

  it('reports offline when the gateway answers an error status', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json({}, { status: 503 })));

    await expect(probeBackend()).resolves.toBe('offline');
  });

  it('reports offline when the request fails outright', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.error()));

    await expect(probeBackend()).resolves.toBe('offline');
  });

  it('gives up at the timeout instead of hanging on a dead socket', async () => {
    // The real failure mode outside the schedule window is a request that never
    // settles, not one that is refused — without the abort the app would never
    // render.
    server.use(
      http.get(HEALTH, async () => {
        await delay(200);
        return HttpResponse.json({ status: 'ok' });
      }),
    );

    await expect(probeBackend(10)).resolves.toBe('offline');
  });
});
