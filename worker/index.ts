// Same-origin reverse proxy for /api/* (CD-FE-02).
//
// Without this the bundle calls the gateway cross-origin, which forces
// AUTH_COOKIE_SAME_SITE=none on the backend and a CORS allow-list on every
// route. Proxying makes the auth cookie same-site and removes CORS from the
// picture entirely — the gateway sets a host-only cookie (no Domain attribute,
// see apps/gateway/src/common/auth-cookie.ts), so the browser attributes it to
// this Worker's domain.
//
// Billing: `run_worker_first = ["/api/*"]` in wrangler.toml means static assets
// are still served without invoking this script — those stay free and unmetered.
// Only API calls count against the Workers request quota (100k/day on free), and
// subrequests to the gateway are not billed.
//
// NOT covered: Socket.IO. VITE_CHAT_URL / VITE_WS_NOTIFICATION_URL still point at
// the gateway origin directly, because Workers cannot proxy a WebSocket upgrade
// to an external origin without holding the connection open (which is metered
// duration, not a free asset hit).
import { buildUpstreamHeaders, methodAllowsBody, resolveUpstreamUrl } from './proxy';

interface Env {
  /** Gateway origin, origin-only, no trailing path. Injected at deploy time — never committed. */
  GATEWAY_ORIGIN?: string;
  /** Static-assets binding, present because wrangler.toml declares `[assets] binding`. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// Streaming a request body through fetch() requires `duplex: 'half'`; the DOM
// lib's RequestInit predates it.
type ProxyRequestInit = RequestInit & { duplex?: 'half' };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.GATEWAY_ORIGIN) {
      // Fail loudly rather than letting `new URL(undefined)` throw an opaque 1101.
      return Response.json(
        { statusCode: 500, status: 'error', message: 'GATEWAY_ORIGIN is not configured on this Worker' },
        { status: 500 },
      );
    }

    const upstreamUrl = resolveUpstreamUrl(request.url, env.GATEWAY_ORIGIN);
    // run_worker_first routes only /api/* here. Anything else arriving means the
    // config drifted, so fall back to the assets instead of proxying it.
    if (upstreamUrl === null) return env.ASSETS.fetch(request);

    const init: ProxyRequestInit = {
      method: request.method,
      headers: buildUpstreamHeaders(request.headers, request.headers.get('CF-Connecting-IP')),
      body: methodAllowsBody(request.method) ? request.body : null,
      // The gateway's 3xx belong to the browser (payment redirects); following
      // them here would swallow the Location and break the return flow.
      redirect: 'manual',
      duplex: 'half',
    };

    // Returned as-is: an untouched Response keeps Set-Cookie intact, which
    // rebuilding through `new Response(body, { headers })` can flatten.
    return fetch(upstreamUrl, init);
  },
};
