import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createRefCountedSocket, SOCKET_CONNECT_OPTIONS, RELEASE_GRACE_MS } from './socket';

interface FakeSocket {
  connected: boolean;
  disconnect: ReturnType<typeof vi.fn>;
}

function setup() {
  const created: FakeSocket[] = [];
  const onCreate = vi.fn();
  const onDestroy = vi.fn();
  const ref = createRefCountedSocket<Socket>('http://test/ns', {
    onCreate,
    onDestroy,
    createSocket: () => {
      const fake: FakeSocket = { connected: true, disconnect: vi.fn() };
      created.push(fake);
      return fake as unknown as Socket;
    },
  });
  return { ref, created, onCreate, onDestroy };
}

describe('SOCKET_CONNECT_OPTIONS', () => {
  it('sends the auth cookie and forces the websocket-only transport (SCALE-01b)', () => {
    // Polling handshakes round-robin across clustered gateway workers and break;
    // pure websocket works cross-worker. Both must hold for the backend to scale.
    expect(SOCKET_CONNECT_OPTIONS.withCredentials).toBe(true);
    expect(SOCKET_CONNECT_OPTIONS.transports).toEqual(['websocket']);
  });
});

describe('createRefCountedSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Run out the post-release grace period so the deferred close lands. */
  function flushGrace(): void {
    vi.advanceTimersByTime(RELEASE_GRACE_MS);
  }

  it('opens one socket on first acquire and attaches handlers once', () => {
    const { ref, created, onCreate } = setup();
    expect(ref.current()).toBeNull();

    ref.acquire();
    ref.acquire();

    expect(created).toHaveLength(1);
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(ref.current()).toBe(created[0] as unknown as Socket);
  });

  it('keeps the socket alive while any consumer holds a reference', () => {
    const { ref, created, onDestroy } = setup();
    const releaseA = ref.acquire();
    ref.acquire();

    releaseA();

    expect(created[0].disconnect).not.toHaveBeenCalled();
    expect(onDestroy).not.toHaveBeenCalled();
    expect(ref.current()).not.toBeNull();
  });

  it('disconnects and runs onDestroy when the last consumer releases', () => {
    const { ref, created, onDestroy } = setup();
    const releaseA = ref.acquire();
    const releaseB = ref.acquire();

    releaseA();
    releaseB();
    flushGrace();

    expect(created[0].disconnect).toHaveBeenCalledTimes(1);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(ref.current()).toBeNull();
  });

  it('a double-released handle does not steal another consumer\'s reference', () => {
    const { ref, created } = setup();
    const releaseA = ref.acquire();
    ref.acquire();

    releaseA();
    releaseA(); // defensive double cleanup — must be a no-op

    expect(created[0].disconnect).not.toHaveBeenCalled();
    expect(ref.current()).not.toBeNull();
  });

  it('re-acquiring after teardown opens a fresh socket', () => {
    const { ref, created, onCreate, onDestroy } = setup();
    const release = ref.acquire();
    release();
    flushGrace();

    ref.acquire();

    expect(created).toHaveLength(2);
    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(ref.current()).toBe(created[1] as unknown as Socket);
  });

  it('keeps the socket open across a StrictMode-style remount', () => {
    // Mount → cleanup → mount in the same tick. Disconnecting synchronously
    // would abort a still-handshaking websocket and open a second one.
    const { ref, created, onCreate, onDestroy } = setup();
    const release = ref.acquire();
    release();
    ref.acquire();
    flushGrace();

    expect(created).toHaveLength(1);
    expect(created[0].disconnect).not.toHaveBeenCalled();
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onDestroy).not.toHaveBeenCalled();
    expect(ref.current()).toBe(created[0] as unknown as Socket);
  });

  it('does not close while a consumer still holds the socket after the grace period', () => {
    const { ref, created, onDestroy } = setup();
    const releaseA = ref.acquire();
    releaseA();
    const releaseB = ref.acquire();
    flushGrace();

    expect(created[0].disconnect).not.toHaveBeenCalled();

    releaseB();
    flushGrace();

    expect(created[0].disconnect).toHaveBeenCalledTimes(1);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(ref.current()).toBeNull();
  });
});
