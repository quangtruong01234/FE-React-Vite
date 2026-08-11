/** Used when the env var is absent entirely — the local gateway (see .env.example). */
const DEV_FALLBACK_ORIGIN = 'http://localhost:3000';

/**
 * Builds the socket.io connection target for a namespace from the configured
 * gateway origin (`VITE_CHAT_URL` / `VITE_WS_NOTIFICATION_URL`).
 *
 * A relative value (`/`, or empty) means **same origin**: deployed, the Worker
 * reverse-proxies `/socket.io/*` to the gateway (see worker/index.ts), and the
 * handshake has to stay on the app's own origin or it travels without the
 * host-only `access_token` cookie — the socket then connects at the transport
 * level and the server immediately disconnects the namespace. socket.io reads a
 * leading-slash string as "this origin, that namespace", so the namespace alone
 * is the correct target.
 *
 * An absolute origin is kept as-is for local dev, where the Vite server and the
 * gateway are different ports and the cookie is host-only on `localhost`
 * regardless of port.
 */
export function resolveSocketUrl(configuredOrigin: string | undefined, namespace: string): string {
  const origin = (configuredOrigin ?? DEV_FALLBACK_ORIGIN).trim();
  if (origin === '' || origin === '/') return namespace;
  return `${origin.replace(/\/+$/, '')}${namespace}`;
}
