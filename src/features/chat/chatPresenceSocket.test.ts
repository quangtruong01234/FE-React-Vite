import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import type { Conversation } from '@/types';

const { sockets, FakeSocket } = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  class FakeSocket {
    connected = true;
    handlers = new Map<string, Handler>();
    io = { on: vi.fn(), removeAllListeners: vi.fn() };
    on = vi.fn((event: string, cb: Handler): FakeSocket => {
      this.handlers.set(event, cb);
      return this;
    });
    emit = vi.fn();
    removeAllListeners = vi.fn();
    disconnect = vi.fn();
    fire(event: string, ...args: unknown[]): void {
      this.handlers.get(event)?.(...args);
    }
  }
  const sockets: InstanceType<typeof FakeSocket>[] = [];
  return { sockets, FakeSocket };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  }),
}));

const CONV_A = 'conv_000000000000000A';
const CONV_B = 'conv_000000000000000B';
const CONV_C = 'conv_000000000000000C';

function conversation(id: string): Conversation {
  return {
    id,
    user1Id: 'usr_0000000000000001',
    user2Id: 'usr_0000000000000002',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastMessage: null,
    unreadCount: 0,
  };
}

/** Conversation ids the socket emitted a `join` for, in order. */
function joinedIds(socket: InstanceType<typeof FakeSocket>): string[] {
  return socket.emit.mock.calls
    .filter(([event]) => event === 'join')
    .map(([, payload]) => (payload as { conversationId: string }).conversationId);
}

/**
 * The module keeps its socket + joined-room state at module scope, so each test
 * re-imports it fresh. Both dynamic imports resolve against the same freshly
 * reset registry, i.e. the module under test and the test share one queryClient.
 */
async function loadModule(): Promise<{
  acquireChatPresenceSocket: (meId: string | undefined) => () => void;
  setQueryData: (convs: Conversation[]) => void;
}> {
  vi.resetModules();
  const [{ acquireChatPresenceSocket }, { queryClient }, { queryKeys }] = await Promise.all([
    import('./chatPresenceSocket'),
    import('@/lib/query/queryClient'),
    import('@/hooks/query/queryKeys'),
  ]);
  return {
    acquireChatPresenceSocket,
    setQueryData: (convs) => queryClient.setQueryData(queryKeys.conversations.all, convs),
  };
}

describe('chat presence socket rooms', () => {
  beforeEach(() => {
    sockets.length = 0;
    server.use(
      http.get(`${API_BASE}/chat/conversations`, () =>
        HttpResponse.json({ data: [conversation(CONV_A), conversation(CONV_B)] }),
      ),
    );
  });

  it('joins every conversation the viewer has on connect', async () => {
    const { acquireChatPresenceSocket } = await loadModule();
    const release = acquireChatPresenceSocket('usr_0000000000000001');
    const socket = sockets[0];

    socket.fire('connect');

    await vi.waitFor(() => expect(joinedIds(socket)).toEqual([CONV_A, CONV_B]));
    release();
  });

  it('re-joins every conversation after a reconnect', async () => {
    const { acquireChatPresenceSocket } = await loadModule();
    const release = acquireChatPresenceSocket('usr_0000000000000001');
    const socket = sockets[0];

    socket.fire('connect');
    await vi.waitFor(() => expect(joinedIds(socket)).toEqual([CONV_A, CONV_B]));
    socket.emit.mockClear();

    // socket.io reuses the same client instance across a reconnect and fires
    // `connect` again — but the server-side socket is new and holds no rooms,
    // so every conversation must be joined again or `new_message` never
    // arrives on this socket for the rest of the session.
    socket.fire('connect');

    expect(joinedIds(socket)).toEqual([CONV_A, CONV_B]);
    release();
  });

  it('joins only the new thread when the conversation list grows', async () => {
    const { acquireChatPresenceSocket, setQueryData } = await loadModule();
    const release = acquireChatPresenceSocket('usr_0000000000000001');
    const socket = sockets[0];

    socket.fire('connect');
    await vi.waitFor(() => expect(joinedIds(socket)).toEqual([CONV_A, CONV_B]));
    socket.emit.mockClear();

    setQueryData([conversation(CONV_A), conversation(CONV_B), conversation(CONV_C)]);

    expect(joinedIds(socket)).toEqual([CONV_C]);
    release();
  });
});
