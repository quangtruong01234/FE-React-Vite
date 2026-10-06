import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createRefCountedSocket, loadSocketIo, SOCKET_CONNECT_OPTIONS, RELEASE_GRACE_MS } from './socket';

// `isDemoMode` is a plain module-level read, so the only way to flip it per-test
// is to stand in for the module. Defaults to false: every other test in this
// file describes the normal, backend-online path.
const { demoMode } = vi.hoisted(() => ({ demoMode: { value: false } }));
vi.mock('@/lib/demo/backendStatus', () => ({ isDemoMode: () => demoMode.value }));

// The production path (no `createSocket` seam) loads socket.io-client lazily.
const { ioMock } = vi.hoisted(() => ({
  ioMock: vi.fn(() => ({ connected: true, disconnect: vi.fn() })),
}));
vi.mock('socket.io-client', () => ({ io: ioMock }));

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

describe('createRefCountedSocket — demo mode (DEMO-RETRY-01)', () => {
  beforeEach(() => {
    demoMode.value = true;
  });
  afterEach(() => {
    demoMode.value = false;
  });

  it('opens no connection, because the gateway is away and the handshake would retry forever', () => {
    const { ref, created, onCreate } = setup();

    ref.acquire();

    expect(created).toHaveLength(0);
    expect(onCreate).not.toHaveBeenCalled();
    expect(ref.current()).toBeNull();
  });

  it('still returns a release fn, so effect cleanups stay unconditional', () => {
    const { ref, onDestroy } = setup();

    const release = ref.acquire();

    expect(release).toBeTypeOf('function');
    expect(() => {
      release();
      release();
    }).not.toThrow();
    expect(onDestroy).not.toHaveBeenCalled();
  });
});

describe('createRefCountedSocket — lazy socket.io-client (PERF-LCP-02)', () => {
  beforeEach(() => {
    ioMock.mockClear();
  });

  it('loads the client on first acquire and opens one connection with the shared options', async () => {
    const onCreate = vi.fn();
    const ref = createRefCountedSocket<Socket>('http://test/ns', { onCreate });

    ref.acquire();
    ref.acquire();
    expect(ref.current()).toBeNull();

    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(ioMock).toHaveBeenCalledTimes(1);
    expect(ioMock).toHaveBeenCalledWith('http://test/ns', SOCKET_CONNECT_OPTIONS);
    expect(ref.current()).not.toBeNull();
  });

  it('opens nothing when every consumer released before the client loaded', async () => {
    vi.useFakeTimers();
    const onCreate = vi.fn();
    const ref = createRefCountedSocket<Socket>('http://test/ns', { onCreate });

    ref.acquire()();
    vi.advanceTimersByTime(RELEASE_GRACE_MS);
    vi.useRealTimers();
    await loadSocketIo();
    await Promise.resolve();

    expect(ioMock).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
    expect(ref.current()).toBeNull();
  });
});

// A value import of socket.io-client anywhere in src/ puts it back in the entry chunk.
describe('socket.io-client stays out of the entry chunk (PERF-LCP-02)', () => {
  const sources = import.meta.glob<string>(['../../**/*.{ts,tsx}', '!../../**/*.test.{ts,tsx}'], {
    eager: true,
    query: '?raw',
    import: 'default',
  });

  it('is only ever imported for types, outside loadSocketIo', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
    const valueImports = Object.entries(sources)
      .filter(([, source]) => /^import\s+(?!type\b)[^;]*from\s+'socket\.io-client'/m.test(source))
      .map(([path]) => path);
    expect(valueImports).toEqual([]);
  });
});
