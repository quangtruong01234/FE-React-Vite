import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';

/**
 * Shared connection options for every storefront socket.io namespace.
 *
 * - `withCredentials: true` — the `access_token` HttpOnly cookie is sent with the
 *   handshake (no token passing in production).
 * - `transports: ['websocket']` — skip the polling handshake entirely. The backend
 *   gateway can run as N clustered workers with no sticky sessions, so a polling
 *   handshake round-robins across workers and breaks; pure websocket works across
 *   workers (broadcasts fan out via a Redis adapter). See backend SCALE-01b.
 */
export const SOCKET_CONNECT_OPTIONS: Partial<ManagerOptions & SocketOptions> = {
  withCredentials: true,
  transports: ['websocket'],
};

/**
 * How long the socket stays open after the last consumer releases.
 *
 * Tearing down synchronously aborts a websocket that is still handshaking —
 * the browser logs "WebSocket is closed before the connection is established"
 * and a replacement connection opens right after. That churn is routine, not
 * exceptional: React StrictMode mounts an effect, cleans it up and mounts it
 * again in the same tick, `useChatPresence` re-runs when `me` resolves, and a
 * route change can unmount the last consumer a moment before the next mounts.
 * A short grace period lets the re-acquire reuse the live socket instead.
 */
export const RELEASE_GRACE_MS = 300;

/**
 * Ref-counted app-scoped socket shared by every consumer of a namespace: the
 * connection opens on the first `acquire()` and closes `RELEASE_GRACE_MS` after
 * the last consumer releases, so there is never more than one live socket per
 * namespace — preventing duplicate events from parallel connections. Shared by
 * the chat presence and notification sockets.
 */
export interface RefCountedSocket<S extends Socket> {
  /** Live socket, or null while no consumer holds a reference. */
  current(): S | null;
  /** Open (or reuse) the socket. Returns a release fn for effect cleanup. */
  acquire(): () => void;
}

export interface RefCountedSocketOptions<S extends Socket> {
  /** Attach event handlers here — runs once per connection lifecycle. */
  onCreate: (socket: S) => void;
  /** Reset consumer-side state here — runs after the last release disconnects. */
  onDestroy?: () => void;
  /** Test seam: replaces the real `io(url, SOCKET_CONNECT_OPTIONS)` call. */
  createSocket?: (url: string) => S;
}

export function createRefCountedSocket<S extends Socket>(
  url: string,
  { onCreate, onDestroy, createSocket }: RefCountedSocketOptions<S>,
): RefCountedSocket<S> {
  let socket: S | null = null;
  let refCount = 0;
  let pendingClose: ReturnType<typeof setTimeout> | null = null;

  function cancelPendingClose(): void {
    if (pendingClose === null) return;
    clearTimeout(pendingClose);
    pendingClose = null;
  }

  function closeNow(): void {
    pendingClose = null;
    // A consumer acquired during the grace period — keep the connection.
    if (refCount > 0) return;
    socket?.disconnect();
    socket = null;
    onDestroy?.();
  }

  return {
    current: () => socket,
    acquire() {
      cancelPendingClose();
      refCount += 1;
      if (!socket) {
        socket = createSocket ? createSocket(url) : (io(url, SOCKET_CONNECT_OPTIONS) as S);
        onCreate(socket);
      }
      let released = false;
      return () => {
        // A release fn may run twice (defensive against unpaired effect
        // cleanups) — it must not steal another consumer's reference.
        if (released) return;
        released = true;
        refCount -= 1;
        if (refCount <= 0) {
          refCount = 0;
          cancelPendingClose();
          pendingClose = setTimeout(closeNow, RELEASE_GRACE_MS);
        }
      };
    },
  };
}
