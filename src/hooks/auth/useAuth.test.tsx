import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { useAuth } from './useAuth';
import { queryKeys } from '@/hooks/query/queryKeys';
import { postAuthEvent, subscribeAuthEvents } from '@/lib/auth/authChannel';
import type { AuthChannelEvent } from '@/lib/auth/authChannel';
import type { User } from '@/types';

vi.mock('@/lib/auth/authChannel', () => ({
  postAuthEvent: vi.fn(),
  subscribeAuthEvents: vi.fn(() => () => {}),
}));

const testUser: User = {
  id: 'usr_0000000000000001',
  username: 'tester',
  email: 'tester@test.com',
  role: { id: 3, name: 'user' },
  isActive: true,
};

function setup(): { queryClient: QueryClient; renderUseAuth: () => ReturnType<typeof renderHook<ReturnType<typeof useAuth>, unknown>> } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, renderUseAuth: () => renderHook(() => useAuth(), { wrapper }) };
}

// The session probe runs on mount; keep it settled as "not logged in".
function stubUnauthenticated(): void {
  server.use(
    http.get(`${API_BASE}/user/me`, () =>
      HttpResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 }),
    ),
  );
}

function capturedSubscriber(): (event: AuthChannelEvent) => void {
  const call = vi.mocked(subscribeAuthEvents).mock.calls[0];
  if (!call) throw new Error('subscribeAuthEvents was never called');
  return call[0];
}

describe('useAuth — cross-tab auth sync wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logout broadcasts a logout event and runs onSuccess after the API call', async () => {
    stubUnauthenticated();
    server.use(
      http.post(`${API_BASE}/user/logout`, () => new HttpResponse(null, { status: 204 })),
    );
    const { renderUseAuth } = setup();
    const { result } = renderUseAuth();
    const onSuccess = vi.fn();

    act(() => result.current.logout({ onSuccess }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(postAuthEvent).toHaveBeenCalledWith({ type: 'logout' });
  });

  it('loginSuccess seeds the auth cache and broadcasts a login event', async () => {
    stubUnauthenticated();
    const { queryClient, renderUseAuth } = setup();
    const { result } = renderUseAuth();

    act(() => result.current.loginSuccess(testUser));

    expect(queryClient.getQueryData(queryKeys.auth.me)).toEqual(testUser);
    expect(postAuthEvent).toHaveBeenCalledWith({ type: 'login' });
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  // AUTH-STALE-01: AuthProvider sits above the router, so nothing re-renders it
  // after login — the hook itself must see the new user, no rerender() allowed.
  it('loginSuccess updates currentUser without an extra render', async () => {
    stubUnauthenticated();
    const { renderUseAuth } = setup();
    const { result } = renderUseAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.loginSuccess(testUser));

    await waitFor(() => expect(result.current.currentUser).toEqual(testUser));
  });

  it('logout then login as someone else never shows the previous user', async () => {
    server.use(
      http.get(`${API_BASE}/user/me`, () => HttpResponse.json({ data: testUser })),
      http.post(`${API_BASE}/user/logout`, () => new HttpResponse(null, { status: 204 })),
    );
    const { renderUseAuth } = setup();
    const { result } = renderUseAuth();
    await waitFor(() => expect(result.current.currentUser).toEqual(testUser));

    act(() => result.current.logout());
    await waitFor(() => expect(result.current.currentUser).toBeNull());

    const nextUser: User = { ...testUser, id: 'usr_0000000000000002', username: 'next' };
    act(() => result.current.loginSuccess(nextUser));

    await waitFor(() => expect(result.current.currentUser).toEqual(nextUser));
  });

  it('resets all queries when another tab broadcasts an auth change', async () => {
    stubUnauthenticated();
    const { queryClient, renderUseAuth } = setup();
    // resetQueries, not clear(): clear() removes cache entries without
    // notifying active observers, so ProtectedRoute would never refetch
    // auth.me and the stale page would stay up.
    const resetSpy = vi.spyOn(queryClient, 'resetQueries');
    renderUseAuth();

    act(() => capturedSubscriber()({ type: 'logout' }));

    expect(resetSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  });

  it('keeps a stable value + callback identity across re-renders (Context memoization)', async () => {
    stubUnauthenticated();
    const { renderUseAuth } = setup();
    const { result, rerender } = renderUseAuth();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const first = result.current;
    rerender();

    // A no-op re-render must not hand consumers a new object/function identity,
    // otherwise every AuthContext consumer re-renders needlessly.
    expect(result.current).toBe(first);
    expect(result.current.loginSuccess).toBe(first.loginSuccess);
    expect(result.current.logout).toBe(first.logout);
  });

  it('unsubscribes from the auth channel on unmount', () => {
    stubUnauthenticated();
    const unsubscribe = vi.fn();
    vi.mocked(subscribeAuthEvents).mockReturnValue(unsubscribe);
    const { renderUseAuth } = setup();
    const { unmount } = renderUseAuth();

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
