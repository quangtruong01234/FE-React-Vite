import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { usersApi } from './users';

describe('usersApi.getFeaturedSellers', () => {
  let captured: URL | undefined;

  afterEach(() => {
    captured = undefined;
  });

  it('calls /user/featured-sellers with the default limit and unwraps data', async () => {
    server.use(
      http.get(`${API_BASE}/user/featured-sellers`, ({ request }) => {
        captured = new URL(request.url);
        return HttpResponse.json({ data: [{ id: 1, username: 'shop1', name: null, avatar: null }] });
      }),
    );

    const sellers = await usersApi.getFeaturedSellers();

    expect(captured?.pathname).toBe('/api/user/featured-sellers');
    expect(captured?.searchParams.get('limit')).toBe('5');
    // Never hits the admin-only /user/all that 403'd for normal users.
    expect(captured?.pathname).not.toContain('/user/all');
    expect(sellers).toEqual([{ id: 1, username: 'shop1', name: null, avatar: null }]);
  });

  it('forwards a custom limit', async () => {
    server.use(
      http.get(`${API_BASE}/user/featured-sellers`, ({ request }) => {
        captured = new URL(request.url);
        return HttpResponse.json({ data: [] });
      }),
    );

    await usersApi.getFeaturedSellers(3);

    expect(captured?.searchParams.get('limit')).toBe('3');
  });
});
