import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './Header';

// Header pulls in cart/auth/chat-presence and two socket-backed widgets; none of
// them matter for the search form, so stub them out.
vi.mock('@/hooks/data/useCart', () => ({ useCart: () => ({ data: undefined }) }));
vi.mock('@/hooks/auth/useRole', () => ({ useRole: () => null }));
vi.mock('@/features/chat/useChat', () => ({ useChatPresence: () => undefined }));
vi.mock('./NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('./ProfileMenu', () => ({ ProfileMenu: () => null }));
// The suggestion dropdown has its own test; here it would only drag a
// QueryClientProvider into a render that is about the plain submit path.
vi.mock('@/features/search/useSearchSuggestions', () => {
  // One frozen result for every render: the real hook memoizes `suggestions`,
  // and the dropdown resets its cursor whenever that array changes identity.
  const stub = { suggestions: [], isLoading: false, isError: false, enabled: false };
  return { useSearchSuggestions: () => stub };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LocationProbe />
      <Routes>
        <Route path="*" element={<Header />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Header search', () => {
  it('gives the icon-only submit button an accessible name', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: 'Tìm kiếm' })).toBeInTheDocument();
  });

  it('submits the query to /marketplace via router navigation', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.type(screen.getByPlaceholderText(/tìm sản phẩm/i), 'iphone');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/marketplace?search=iphone');
  });
});
