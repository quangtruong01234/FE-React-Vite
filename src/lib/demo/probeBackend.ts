import {
  HEALTH_PROBE_PATH,
  HEALTH_PROBE_TIMEOUT_MS,
  classifyProbe,
  type BackendStatus,
} from './backendStatus';

/**
 * One shot at `GET /health`, capped at 3s.
 *
 * Deliberately raw `fetch` rather than `api.misc.health()`: `request()` retries
 * a 503 after a `Retry-After` delay and routes 401s into the login redirect.
 * Both are right for real traffic and wrong here — this call only has to answer
 * "is anything listening", within a budget, without side effects.
 *
 * `cache: 'no-store'` because a cached 200 from an earlier session would report
 * a gateway that is no longer up.
 */
export async function probeBackend(
  timeoutMs: number = HEALTH_PROBE_TIMEOUT_MS,
): Promise<BackendStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(HEALTH_PROBE_PATH, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    });
    return classifyProbe({ ok: res.ok, contentType: res.headers.get('content-type') });
  } catch {
    // Abort, DNS failure, connection refused, CORS — all the same verdict.
    return classifyProbe(null);
  } finally {
    clearTimeout(timer);
  }
}
