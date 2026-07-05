import { describe, it, expect, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createRefCountedSocket } from './socket';

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

describe('createRefCountedSocket', () => {
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

    ref.acquire();

    expect(created).toHaveLength(2);
    expect(onCreate).toHaveBeenCalledTimes(2);
    expect(onDestroy).toHaveBeenCalledTimes(1);
    expect(ref.current()).toBe(created[1] as unknown as Socket);
  });
});
