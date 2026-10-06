import type { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import { isDemoMode } from '@/lib/demo/backendStatus';

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
 * socket.io-client (~16 kB gzip with engine.io) loads on the first socket a page opens, not with
 * the entry chunk: the logged-out boot (`/login`, the LCP page Lighthouse measures) never opens
 * one, and a signed-in page opens its sockets after first paint anyway (PERF-LCP-02). Every
 * `io()` call in `src/` goes through here — a static `import { io }` anywhere pulls it back in.
 */
let socketIo: Promise<typeof io> | null = null;

export function loadSocketIo(): Promise<typeof io> {
  // One load shared by every caller; a failed one is forgotten so the next caller retries.
  socketIo ??= import('socket.io-client').then(
    (module) => module.io,
    (error: unknown) => {
      socketIo = null;
      throw error;
    },
  );
  return socketIo;
}

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
  /** Live socket, or null while no consumer holds a reference or socket.io-client is loading. */
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
  let loading = false;

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

  function open(): void {
    if (createSocket) {
      socket = createSocket(url);
      onCreate(socket);
      return;
    }
    loading = true;
    loadSocketIo()
      .then((connect) => {
        loading = false;
        // Every consumer released while the client loaded — nothing to open.
        if (refCount === 0 || socket) return;
        socket = connect(url, SOCKET_CONNECT_OPTIONS) as S;
        onCreate(socket);
      })
      .catch((error: unknown) => {
        // A failed chunk fetch (offline, stale deploy): the next acquire retries.
        loading = false;
        console.error('[socket] could not load socket.io-client', error);
      });
  }

  return {
    current: () => socket,
    acquire() {
      // Demo mode: the gateway is away, so the handshake cannot succeed and
      // socket.io would retry it on a backoff forever, printing a websocket
      // warning each time (DEMO-RETRY-01). MSW cannot intercept this — it is a
      // websocket, not `fetch`. Consumers already tolerate a socket that never
      // arrives: nothing reads `current()`, and the queries behind the bell are
      // served from the demo handlers.
      if (isDemoMode()) return () => {};

      cancelPendingClose();
      refCount += 1;
      if (!socket && !loading) open();
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
