import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { AuthContext, type AuthContextValue } from '@/context/authContextValue';
import type { User } from '@/types';
import { SellerFollowButton } from './SellerFollowButton';

const SELLER = 'usr_shop';
const VIEWER: User = {
  id: 'usr_me',
  username: 'buyer',
  email: 'buyer@test.com',
  role: { id: 3, name: 'user' },
  isActive: true,
};

function auth(currentUser: User | null): AuthContextValue {
  return { currentUser, isLoading: false, loginSuccess: vi.fn(), logout: vi.fn() };
}

function stubFollowing(ids: string[]): void {
  server.use(
    http.get(`${API_BASE}/social/users/${VIEWER.id}/following`, () =>
      HttpResponse.json({
        data: {
          data: ids.map((id) => ({ createdAt: '2026-09-25T00:00:00Z', user: { id, username: id } })),
          total: ids.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
        },
      }),
    ),
  );
}

function renderButton(currentUser: User | null) {
  return renderWithProviders(
    <AuthContext.Provider value={auth(currentUser)}>
      <Routes>
        <Route path="/" element={<SellerFollowButton sellerId={SELLER} sellerExists className="" />} />
        <Route path="/login" element={<div>trang đăng nhập</div>} />
      </Routes>
    </AuthContext.Provider>,
  );
}

describe('SellerFollowButton', () => {
  it('follows the seller on click', async () => {
    stubFollowing([]);
    const followed = vi.fn();
    server.use(
      http.post(`${API_BASE}/social/users/${SELLER}/follow`, () => {
        followed();
        return HttpResponse.json({ data: { followed: true, followingId: SELLER } });
      }),
    );
    renderButton(VIEWER);

    const button = await screen.findByRole('button', { name: 'Theo dõi', pressed: false });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await waitFor(() => expect(followed).toHaveBeenCalledTimes(1));
  });

  it('unfollows when the buyer already follows the seller', async () => {
    stubFollowing([SELLER]);
    const unfollowed = vi.fn();
    server.use(
      http.delete(`${API_BASE}/social/users/${SELLER}/follow`, () => {
        unfollowed();
        return HttpResponse.json({ data: { followed: false, followingId: SELLER } });
      }),
    );
    renderButton(VIEWER);

    const button = await screen.findByRole('button', { name: 'Đang theo dõi', pressed: true });
    await userEvent.click(button);

    await waitFor(() => expect(unfollowed).toHaveBeenCalledTimes(1));
  });

  it('sends a signed-out visitor to login', async () => {
    renderButton(null);

    await userEvent.click(screen.getByRole('button', { name: 'Theo dõi' }));

    expect(await screen.findByText('trang đăng nhập')).toBeInTheDocument();
  });
});
