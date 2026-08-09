// Pure request-shaping helpers for the /api reverse proxy (see worker/index.ts).
// Kept separate so they can be unit-tested without a Workers runtime.

/** Path prefix the Worker proxies. Must stay in sync with `run_worker_first` in wrangler.toml. */
export const PROXY_PREFIX = '/api';

// Connection-scoped headers describe the browser→Worker hop only. Forwarding
// them verbatim to nginx is meaningless at best and breaks framing at worst
// (RFC 9110 §7.6.1).
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

export function isProxiedPath(pathname: string): boolean {
  return pathname === PROXY_PREFIX || pathname.startsWith(`${PROXY_PREFIX}/`);
}

/**
 * Maps a browser-facing URL onto the gateway. The `/api` prefix is preserved —
 * the gateway serves its routes under `/api` too, so this is a pure origin swap.
 * Returns null for anything outside `/api`, which the caller hands to the assets.
 *
 * `gatewayOrigin` must be origin-only (`https://host`); a trailing path on it is
 * dropped, because the incoming pathname replaces it wholesale.
 */
export function resolveUpstreamUrl(requestUrl: string, gatewayOrigin: string): string | null {
  const url = new URL(requestUrl);
  if (!isProxiedPath(url.pathname)) return null;
  return new URL(`${url.pathname}${url.search}`, gatewayOrigin).toString();
}

export function buildUpstreamHeaders(incoming: Headers, clientIp: string | null): Headers {
  const headers = new Headers(incoming);
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
  // fetch() derives Host from the upstream URL. Leaving the Worker's own Host in
  // place would make nginx match the wrong server block and answer 404.
  headers.delete('host');
  // Every request now reaches the gateway from Cloudflare's IP, so per-IP rate
  // limiting upstream would see the whole site as one client without this.
  if (clientIp) {
    const forwarded = headers.get('x-forwarded-for');
    headers.set('x-forwarded-for', forwarded ? `${forwarded}, ${clientIp}` : clientIp);
  }
  return headers;
}

export function methodAllowsBody(method: string): boolean {
  const normalized = method.toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD';
}
