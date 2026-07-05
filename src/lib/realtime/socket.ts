import { io, type Socket } from 'socket.io-client';

/**
 * Ref-counted app-scoped socket shared by every consumer of a namespace: the
 * connection opens on the first `acquire()` and closes when the last consumer
 * releases, so there is never more than one live socket per namespace —
 * preventing duplicate events from parallel connections. Shared by the chat
 * presence and notification sockets.
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
  /** Test seam: replaces the real `io(url, { withCredentials: true })` call. */
  createSocket?: (url: string) => S;
}

export function createRefCountedSocket<S extends Socket>(
  url: string,
  { onCreate, onDestroy, createSocket }: RefCountedSocketOptions<S>,
): RefCountedSocket<S> {
  let socket: S | null = null;
  let refCount = 0;

  return {
    current: () => socket,
    acquire() {
      refCount += 1;
      if (!socket) {
        socket = createSocket ? createSocket(url) : (io(url, { withCredentials: true }) as S);
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
          socket?.disconnect();
          socket = null;
          refCount = 0;
          onDestroy?.();
        }
      };
    },
  };
}
