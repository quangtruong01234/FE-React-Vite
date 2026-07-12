import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ApiErrorState } from './ApiErrorState';
import type { ApiError } from '@/types';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAtErrorRoute(error: ApiError) {
  return render(
    <MemoryRouter initialEntries={['/some/broken/path']}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<div>home page</div>} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="*" element={<ApiErrorState error={error} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ApiErrorState navigation', () => {
  it('navigates to / via the router when clicking "Trang chủ" (no full reload)', async () => {
    const user = userEvent.setup();
    renderAtErrorRoute({ statusCode: 404, status: 404, message: 'Not found' });

    await user.click(screen.getByRole('button', { name: /trang chủ/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('navigates to the primary action route (401 → /login) via the router', async () => {
    const user = userEvent.setup();
    renderAtErrorRoute({ statusCode: 401, status: 401, message: 'Unauthorized' });

    await user.click(screen.getByRole('button', { name: /đăng nhập lại/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders nothing for an unmapped status code', () => {
    renderAtErrorRoute({ statusCode: 418, status: 418, message: 'teapot' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
