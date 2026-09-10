import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import type { Conversation, Message } from '@/types';

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

const playMessageReceived = vi.hoisted(() => vi.fn());
vi.mock('@/lib/realtime/chatSound', () => ({ playMessageReceived }));

const CONV_A = 'conv_000000000000000A';
const CONV_B = 'conv_000000000000000B';
const ME = 'usr_0000000000000001';
const PEER = 'usr_0000000000000002';

function conversation(id: string): Conversation {
  return {
    id,
    user1Id: ME,
    user2Id: PEER,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastMessage: null,
    unreadCount: 0,
  };
}

function incoming(conversationId: string, content: string): Message {
  return {
    id: `msg_${content}`,
    conversationId,
    senderId: PEER,
    content,
    createdAt: '2026-09-10T00:00:00.000Z',
    parentMessageId: null,
  };
}

/**
 * The module keeps its socket state at module scope, so each test re-imports it
 * fresh. Both dynamic imports resolve against the same freshly reset registry,
 * i.e. the module under test and the test share one queryClient.
 */
async function loadModule(): Promise<{
  acquireChatPresenceSocket: (meId: string | undefined) => () => void;
  getConversations: () => Conversation[] | undefined;
}> {
  vi.resetModules();
  const [{ acquireChatPresenceSocket }, { queryClient }, { queryKeys }] = await Promise.all([
    import('./chatPresenceSocket'),
    import('@/lib/query/queryClient'),
    import('@/hooks/query/queryKeys'),
  ]);
  return {
    acquireChatPresenceSocket,
    getConversations: () => queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all),
  };
}

describe('chat presence socket', () => {
  beforeEach(() => {
    sockets.length = 0;
    playMessageReceived.mockClear();
    server.use(
      http.get(`${API_BASE}/chat/conversations`, () =>
        HttpResponse.json({ data: [conversation(CONV_A), conversation(CONV_B)] }),
      ),
    );
  });

  // CHAT-ROOM-01: the gateway joins `user:{id}` itself on connect and emits
  // `new_message` to both participants' user rooms, so joining per conversation
  // from the client is dead weight — and the joined-id bookkeeping it needed was
  // the source of the "socket sits in no room after a reconnect" bug.
  it('never emits a join, on connect or reconnect', async () => {
    const { acquireChatPresenceSocket, getConversations } = await loadModule();
    const release = acquireChatPresenceSocket(ME);
    const socket = sockets[0];

    socket.fire('connect');
    await vi.waitFor(() => expect(getConversations()).toHaveLength(2));
    socket.fire('connect');
    await vi.waitFor(() => expect(getConversations()).toHaveLength(2));

    expect(socket.emit).not.toHaveBeenCalled();
    release();
  });

  it('updates the list preview and badge for a conversation it never joined', async () => {
    const { acquireChatPresenceSocket, getConversations } = await loadModule();
    const release = acquireChatPresenceSocket(ME);
    const socket = sockets[0];

    socket.fire('connect');
    await vi.waitFor(() => expect(getConversations()).toHaveLength(2));

    socket.fire('new_message', incoming(CONV_B, 'ping'));

    const conv = getConversations()?.find((c) => c.id === CONV_B);
    expect(conv?.lastMessage?.content).toBe('ping');
    expect(conv?.unreadCount).toBe(1);
    expect(playMessageReceived).toHaveBeenCalledTimes(1);
    release();
  });

  it('refetches the conversation list on every connect to repair the offline gap', async () => {
    const { acquireChatPresenceSocket, getConversations } = await loadModule();
    const release = acquireChatPresenceSocket(ME);
    const socket = sockets[0];

    socket.fire('connect');
    await vi.waitFor(() => expect(getConversations()).toHaveLength(2));

    // A message delivered while the socket was down leaves the cache stale; the
    // reconnect fetch is what puts the real preview back.
    server.use(
      http.get(`${API_BASE}/chat/conversations`, () =>
        HttpResponse.json({
          data: [
            {
              ...conversation(CONV_A),
              lastMessage: {
                id: 'msg_missed',
                content: 'missed while offline',
                senderId: PEER,
                createdAt: '2026-09-10T00:00:00.000Z',
              },
              unreadCount: 1,
            },
            conversation(CONV_B),
          ],
        }),
      ),
    );
    socket.fire('connect');

    await vi.waitFor(() =>
      expect(getConversations()?.find((c) => c.id === CONV_A)?.lastMessage?.content).toBe(
        'missed while offline',
      ),
    );
    release();
  });
});
