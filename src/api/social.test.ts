import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { socialApi } from './social';
import { LIST_SEARCH_MAX } from './client';

async function captureFeedUrl(search?: string): Promise<URL | undefined> {
  let captured: URL | undefined;
  server.use(
    http.get(`${API_BASE}/social/posts`, ({ request }) => {
      captured = new URL(request.url);
      return HttpResponse.json({ data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0, hasNext: false } });
    }),
  );
  await socialApi.getFeed(1, 10, search);
  return captured;
}

describe('socialApi.getFeed search', () => {
  it('sends the trimmed term as `search`', async () => {
    const url = await captureFeedUrl('  ban phim  ');
    expect(url?.searchParams.get('search')).toBe('ban phim');
  });

  it('omits `search` for a blank or whitespace-only term', async () => {
    expect((await captureFeedUrl('   '))?.searchParams.has('search')).toBe(false);
    expect((await captureFeedUrl())?.searchParams.has('search')).toBe(false);
  });

  it('caps the term at the backend limit instead of letting it 400', async () => {
    const url = await captureFeedUrl('x'.repeat(LIST_SEARCH_MAX + 20));
    expect(url?.searchParams.get('search')).toBe('x'.repeat(LIST_SEARCH_MAX));
  });
});
