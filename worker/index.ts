// Same-origin reverse proxy for /api/* (CD-FE-02).
//
// Without this the bundle calls the gateway cross-origin, which forces
// AUTH_COOKIE_SAME_SITE=none on the backend and a CORS allow-list on every
// route. Proxying makes the auth cookie same-site and removes CORS from the
// picture entirely — the gateway sets a host-only cookie (no Domain attribute,
// see apps/gateway/src/common/auth-cookie.ts), so the browser attributes it to
// this Worker's domain.
//
// Socket.IO (`/socket.io/*`) is proxied for exactly the same reason (CD-FE-03).
// Pointing the sockets at the gateway origin instead makes the handshake
// cross-site, where the host-only cookie is never sent: the transport connects,
// the server answers `41/notifications,` (namespace disconnect) because the
// handshake is unauthenticated, and realtime silently dies while REST still
// works. Proxying puts the handshake back on this origin, cookie included.
//
// Billing: `run_worker_first` in wrangler.toml lists only these two prefixes, so
// static assets are still served without invoking this script — those stay free
// and unmetered. Only API calls and socket handshakes count against the Workers
// request quota (100k/day on free), and subrequests to the gateway are not
// billed. A proxied WebSocket costs ONE request: the Worker returns the upstream
// 101 and Cloudflare splices the two sockets together, so frames flow without
// re-invoking this script and an idle connection bills nothing.
import { buildUpstreamHeaders, isWebSocketUpgrade, methodAllowsBody, resolveUpstreamUrl } from './proxy';

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
    // run_worker_first routes only the proxied prefixes here. Anything else
    // arriving means the config drifted, so fall back to the assets.
    if (upstreamUrl === null) return env.ASSETS.fetch(request);

    // A WebSocket upgrade is forwarded by handing the original Request to
    // fetch() as the init. That form is what preserves the upgrade — rebuilding
    // the request from a plain Headers object drops `Upgrade`/`Connection` (they
    // are hop-by-hop, which is exactly what buildUpstreamHeaders strips) and the
    // gateway answers a normal 200 instead of a 101. The response is returned
    // untouched so its attached WebSocket survives; Cloudflare then pipes the
    // frames itself. Client IP still reaches the gateway as CF-Connecting-IP,
    // which rides along with the forwarded headers.
    if (isWebSocketUpgrade(request.headers)) return fetch(upstreamUrl, request);

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
