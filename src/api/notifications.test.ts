import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { notificationsApi } from './notifications';

const EMPTY_PAGE = { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false };

async function captureListUrl(unreadOnly?: boolean): Promise<URL | undefined> {
  let captured: URL | undefined;
  server.use(
    http.get(`${API_BASE}/notifications`, ({ request }) => {
      captured = new URL(request.url);
      return HttpResponse.json({ data: EMPTY_PAGE });
    }),
  );
  await notificationsApi.getList(1, 10, unreadOnly);
  return captured;
}

describe('notificationsApi (NOTIF-INBOX-01)', () => {
  it('sends the literal `unreadOnly=true` for the unread tab', async () => {
    expect((await captureListUrl(true))?.searchParams.get('unreadOnly')).toBe('true');
  });

  it('omits `unreadOnly` for the unfiltered list', async () => {
    expect((await captureListUrl(false))?.searchParams.has('unreadOnly')).toBe(false);
    expect((await captureListUrl())?.searchParams.has('unreadOnly')).toBe(false);
  });

  it('marks all read with PATCH read-all and returns the count', async () => {
    let method: string | undefined;
    server.use(
      http.patch(`${API_BASE}/notifications/read-all`, ({ request }) => {
        method = request.method;
        return HttpResponse.json({ updatedCount: 3 });
      }),
    );
    await expect(notificationsApi.markAllRead()).resolves.toEqual({ updatedCount: 3 });
    expect(method).toBe('PATCH');
  });

  it('resolves a 204 delete without parsing a body', async () => {
    server.use(
      http.delete(`${API_BASE}/notifications/:id`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(notificationsApi.remove('ntf_abc')).resolves.toBeUndefined();
  });

  it('surfaces a 404 delete as an ApiError with the status', async () => {
    server.use(
      http.delete(`${API_BASE}/notifications/:id`, () =>
        HttpResponse.json({ message: 'Notification not found' }, { status: 404 })),
    );
    await expect(notificationsApi.remove('ntf_gone')).rejects.toMatchObject({ statusCode: 404 });
  });
});
