import { describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { probeBackend } from './probeBackend';

const HEALTH = `${API_BASE}/gateway/health`;

describe('probeBackend', () => {
  it('reports online when the gateway answers 200', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json({ status: 'ok' })));

    await expect(probeBackend()).resolves.toBe('online');
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
