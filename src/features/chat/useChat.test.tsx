import { describe, it, expect, vi } from 'vitest';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';

const { sockets, FakeSocket } = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;
  class FakeSocket {
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

// Import after the mock so useChat picks up the stubbed socket factory.
import { useChat } from './useChat';

function lastSocket(): InstanceType<typeof FakeSocket> | undefined {
  return sockets[sockets.length - 1];
}

const CONV_A = 'conv_000000000000000A';
const CONV_B = 'conv_000000000000000B';

function emptyPage(): Record<string, unknown> {
  return { data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false } };
}

function Harness(): ReactElement {
  const [convId, setConvId] = useState(CONV_A);
  const { connectionStatus } = useChat(convId, 'usr_0000000000000001');
  return (
    <>
      <button type="button" onClick={() => setConvId(CONV_B)}>switch</button>
      <div data-testid="status">{connectionStatus}</div>
    </>
  );
}

describe('useChat connection status', () => {
  it('starts connecting and becomes connected when the socket connects', async () => {
    server.use(
      http.get(`${API_BASE}/chat/conversations/:id/messages`, () => HttpResponse.json(emptyPage())),
    );
    renderWithProviders(<Harness />);

    expect(screen.getByTestId('status')).toHaveTextContent('connecting');

    act(() => lastSocket()?.fire('connect'));
    expect(screen.getByTestId('status')).toHaveTextContent('connected');
  });

  it('resets to connecting when the conversation changes', async () => {
    server.use(
      http.get(`${API_BASE}/chat/conversations/:id/messages`, () => HttpResponse.json(emptyPage())),
    );
    renderWithProviders(<Harness />);

    act(() => lastSocket()?.fire('connect'));
    expect(screen.getByTestId('status')).toHaveTextContent('connected');

    fireEvent.click(screen.getByText('switch'));

    // The previous thread's "connected" must not leak into the new thread.
    expect(screen.getByTestId('status')).toHaveTextContent('connecting');
    expect(lastSocket()?.emit).not.toHaveBeenCalledWith('join', { conversationId: CONV_A });

    act(() => lastSocket()?.fire('connect'));
    expect(screen.getByTestId('status')).toHaveTextContent('connected');
    expect(lastSocket()?.emit).toHaveBeenCalledWith('join', { conversationId: CONV_B });
  });
});
