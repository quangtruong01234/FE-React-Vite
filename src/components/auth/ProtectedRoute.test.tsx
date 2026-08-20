import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse, delay } from 'msw';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { ProtectedRoute } from './ProtectedRoute';
import type { RequiredRole } from '@/lib/auth/roleAccess';
import type { User, Role } from '@/types';

function stubMe(user: User): void {
  server.use(
    http.get(`${API_BASE}/user/me`, () => HttpResponse.json({ data: user })),
  );
}

function stubMeUnauthenticated(): void {
  server.use(
    http.get(`${API_BASE}/user/me`, () =>
      HttpResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 }),
    ),
  );
}

function makeUser(roleName: Role['name']): User {
  return {
    id: 'usr_0000000000000001',
    username: 'tester',
    email: 'tester@test.com',
    role: { id: 3, name: roleName },
    isActive: true,
  };
}

function renderProtected(requiredRole?: RequiredRole) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>trang chủ</div>} />
      <Route path="/login" element={<div>trang đăng nhập</div>} />
      <Route
        path="/private"
        element={
          <ProtectedRoute requiredRole={requiredRole}>
            <div>nội dung bảo vệ</div>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route: '/private' },
  );
}

describe('ProtectedRoute', () => {
  it('renders PageSkeleton (not a blank page) while the session probe is loading', () => {
    server.use(
      http.get(`${API_BASE}/user/me`, async () => {
        await delay('infinite');
        return HttpResponse.json({ data: makeUser('user') });
      }),
    );
    const { container } = renderProtected();

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(screen.queryByText('nội dung bảo vệ')).not.toBeInTheDocument();
  });

  it('renders children once the session probe resolves', async () => {
    stubMe(makeUser('user'));
    renderProtected();

    expect(await screen.findByText('nội dung bảo vệ')).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated (401)', async () => {
    stubMeUnauthenticated();
    renderProtected();

    expect(await screen.findByText('trang đăng nhập')).toBeInTheDocument();
    expect(screen.queryByText('nội dung bảo vệ')).not.toBeInTheDocument();
  });

  it('redirects home when the role is insufficient for requiredRole', async () => {
    stubMe(makeUser('user'));
    renderProtected('admin');

    expect(await screen.findByText('trang chủ')).toBeInTheDocument();
    expect(screen.queryByText('nội dung bảo vệ')).not.toBeInTheDocument();
  });
});
