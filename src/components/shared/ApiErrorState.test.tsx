import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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

  it('falls back to a generic panel for an unmapped status code', () => {
    renderAtErrorRoute({ statusCode: 418, status: 418, message: 'teapot' });

    expect(screen.getByRole('heading', { name: /đã xảy ra lỗi/i })).toBeInTheDocument();
    expect(screen.getByText('teapot')).toBeInTheDocument();
  });

  it('degrades an unmapped 5xx to the server-error panel', () => {
    renderAtErrorRoute({ statusCode: 504, status: 504, message: 'Gateway Timeout' });

    expect(screen.getByRole('heading', { name: /máy chủ gặp sự cố/i })).toBeInTheDocument();
  });

  it('shows the server-error panel for a plain 500 instead of a blank screen', () => {
    renderAtErrorRoute({ statusCode: 500, status: 500, message: 'Internal server error' });

    expect(screen.getByRole('heading', { name: /máy chủ gặp sự cố/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
  });
});

function renderRateLimited(error: ApiError) {
  const view = render(
    <MemoryRouter>
      <ApiErrorState error={error} />
    </MemoryRouter>,
  );
  const rerenderWith = (next: ApiError) =>
    view.rerender(
      <MemoryRouter>
        <ApiErrorState error={next} />
      </MemoryRouter>,
    );
  return { rerenderWith };
}

describe('ApiErrorState rate-limit countdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses the retry window from the message and disables retry while counting', () => {
    renderRateLimited({ statusCode: 429, status: 429, message: 'Try again in 30 seconds' });

    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại sau 30s/i })).toBeDisabled();
  });

  it('ticks the countdown down once per second', () => {
    vi.useFakeTimers();
    renderRateLimited({ statusCode: 429, status: 429, message: 'Try again in 30 seconds' });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('29s')).toBeInTheDocument();
  });

  it('resets the countdown when a new rate-limit error arrives', () => {
    vi.useFakeTimers();
    const { rerenderWith } = renderRateLimited({ statusCode: 429, status: 429, message: 'Try again in 30 seconds' });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('28s')).toBeInTheDocument();

    rerenderWith({ statusCode: 429, status: 429, message: 'Try again in 10 seconds' });

    expect(screen.getByText('10s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại sau 10s/i })).toBeDisabled();
  });
});
