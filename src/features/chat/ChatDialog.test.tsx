import { describe, it, expect, vi } from 'vitest';
import { useState, type ReactElement } from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import type { Conversation, User, Role } from '@/types';

vi.mock('./ChatThread', () => ({
  ChatThread: (): ReactElement => <div>thread-mock</div>,
}));

// Import after the mock so ChatDialog picks up the stubbed ChatThread.
import { ChatDialog } from './ChatDialog';

const otherUser: User = {
  id: 'usr_0000000000000002',
  username: 'seller',
  email: 'seller@test.com',
  role: { rol_id: 3, rol_name: 'user' } as Role,
  isActive: true,
};

const conv: Conversation = {
  id: 'conv_0000000000000001',
  user1Id: 'usr_0000000000000001',
  user2Id: 'usr_0000000000000002',
  createdAt: '2026-07-18T00:00:00Z',
  user1LastReadAt: null,
  user2LastReadAt: null,
  lastMessage: null,
  unreadCount: 0,
};

function Harness(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>mở chat</button>
      <button type="button" onClick={() => setOpen(false)}>đóng chat</button>
      <ChatDialog otherUser={otherUser} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

describe('ChatDialog', () => {
  it('creates a conversation on open and renders the thread', async () => {
    server.use(
      http.post(`${API_BASE}/chat/conversations`, () => HttpResponse.json({ data: conv })),
    );
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByText('mở chat'));

    expect(await screen.findByText('thread-mock')).toBeInTheDocument();
  });

  it('drops the stale conversation on close so reopening never flashes the old thread', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE}/chat/conversations`, async () => {
        calls += 1;
        if (calls > 1) await delay('infinite');
        return HttpResponse.json({ data: conv });
      }),
    );
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByText('mở chat'));
    await screen.findByText('thread-mock');

    fireEvent.click(screen.getByText('đóng chat'));
    fireEvent.click(screen.getByText('mở chat'));

    // Second create never resolves: fresh connecting state, no stale thread.
    expect(await screen.findByText('Đang kết nối…')).toBeInTheDocument();
    expect(screen.queryByText('thread-mock')).not.toBeInTheDocument();
  });
});
