import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { AuthProvider } from '@/context/AuthContext';
import { RoleStaleBanner } from './RoleStaleBanner';
import type { CurrentUser } from '@/types';

function signIn(session: Partial<CurrentUser>): void {
  server.use(
    http.get(`${API_BASE}/user/me`, () =>
      HttpResponse.json({
        data: {
          id: 'usr_0000000000000001',
          username: 'tester',
          email: 'tester@test.com',
          role: { id: 3, name: 'user' },
          isActive: true,
          ...session,
        },
      }),
    ),
  );
}

function renderBanner() {
  return renderWithProviders(
    <AuthProvider>
      <RoleStaleBanner />
    </AuthProvider>,
  );
}

describe('RoleStaleBanner', () => {
  it('names both roles when the session runs on an outdated role', async () => {
    signIn({ role: { id: 2, name: 'shop' }, tokenRole: 'user', isRoleStale: true });
    renderBanner();

    const banner = await screen.findByRole('status');
    expect(banner).toHaveTextContent('Vai trò của bạn vừa được đổi thành "Người bán"');
    expect(banner).toHaveTextContent('quyền "Người mua"');
    expect(banner).toHaveTextContent('đăng nhập lại');
  });

  it('stays out of the way while the session role matches', async () => {
    signIn({ role: { id: 3, name: 'user' }, tokenRole: 'user', isRoleStale: false });
    renderBanner();

    // The avatar-less shell renders nothing else, so wait for the query to
    // settle before asserting absence — otherwise this passes on the loading
    // frame no matter what the component does.
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('renders nothing for a response that predates the rollout', async () => {
    signIn({ role: { id: 2, name: 'shop' } });
    renderBanner();

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('offers the one action that resolves it — sign out', async () => {
    let loggedOut = false;
    signIn({ role: { id: 3, name: 'user' }, tokenRole: 'shop', isRoleStale: true });
    server.use(
      http.post(`${API_BASE}/user/logout`, () => {
        loggedOut = true;
        return HttpResponse.json({ data: null });
      }),
    );
    renderBanner();

    await userEvent.click(await screen.findByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(loggedOut).toBe(true));
  });
});
