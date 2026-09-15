import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { User } from '@/types';
import { HeaderSearch } from './HeaderSearch';

function page<T>(data: T[]): { data: { data: T[]; total: number; page: number; limit: number; totalPages: number; hasNext: boolean } } {
  return { data: { data, total: data.length, page: 1, limit: 20, totalPages: 1, hasNext: false } };
}

const viewer: User = {
  id: 'usr_me',
  username: 'me',
  name: 'Me',
  avatar: null,
  isActive: true,
  email: 'me@trybuy.com',
  role: { id: 3, name: 'user' },
};

/** Record the term each server-side search was asked for, to assert on it. */
const sellerSearchSpy = vi.fn<(q: string | null) => void>();
const postSearchSpy = vi.fn<(search: string | null) => void>();

/** The seller group is gated on the session, which is read from `/user/me`. */
function signIn(user: User | null): void {
  server.use(
    http.get(`${API_BASE}/user/me`, () =>
      user
        ? HttpResponse.json({ data: user })
        : HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
    ),
  );
}

beforeEach(() => {
  sellerSearchSpy.mockClear();
  postSearchSpy.mockClear();
  signIn(viewer);
  server.use(
    http.get(`${API_BASE}/products/with-inventory/all`, () =>
      HttpResponse.json(page([{ id: 'prod_1', name: 'iPhone 15 Pro', price: 1000, imageUrl: null }])),
    ),
    http.get(`${API_BASE}/social/posts`, ({ request }) => {
      postSearchSpy(new URL(request.url).searchParams.get('search'));
      return HttpResponse.json(
        page([
          {
            id: 'post_1',
            content: 'Đánh giá iPhone 15 sau một tuần',
            author: { id: 'usr_3', username: 'reviewer', avatar: null },
          },
        ]),
      );
    }),
    http.get(`${API_BASE}/user/search`, ({ request }) => {
      sellerSearchSpy(new URL(request.url).searchParams.get('q'));
      return HttpResponse.json({
        data: [{ id: 'usr_1', username: 'iphonezone', name: 'iPhone Zone', avatar: null }],
      });
    }),
  );
});

function LocationProbe(): React.ReactElement {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderSearch() {
  return renderWithProviders(
    <>
      <HeaderSearch />
      <LocationProbe />
    </>,
  );
}

const box = (): HTMLElement => screen.getByPlaceholderText(/tìm sản phẩm/i);

describe('HeaderSearch', () => {
  it('stays closed until the query is long enough to search on', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'i');
    // Give the debounce a chance to fire before asserting the absence.
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(sellerSearchSpy).not.toHaveBeenCalled();
  });

  it('groups suggestions by kind', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'iphone');

    const list = await screen.findByRole('listbox');
    expect(await within(list).findByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(within(list).getByText('Sản phẩm')).toBeInTheDocument();
    expect(await within(list).findByText('iPhone Zone')).toBeInTheDocument();
    expect(within(list).getByText('Seller')).toBeInTheDocument();
    expect(within(list).getByText('Đánh giá iPhone 15 sau một tuần')).toBeInTheDocument();
    expect(within(list).getByText('Bài viết')).toBeInTheDocument();
    // Both groups are server-side searches now — no client-side filtering.
    // Note there is no `AuthContext` around this tree: the seller search must
    // fire off the `auth.me` query alone, the way it does right after an in-app
    // login, when the context value is still the stale signed-out `null`.
    expect(sellerSearchSpy).toHaveBeenLastCalledWith('iphone');
    expect(postSearchSpy).toHaveBeenLastCalledWith('iphone');
  });

  it('skips the seller search for a signed-out visitor', async () => {
    const user = userEvent.setup();
    signIn(null);
    renderSearch();

    await user.type(box(), 'iphone');

    // The public groups still render; `GET /user/search` is never attempted,
    // since it is JWT-guarded and would only answer 401.
    const list = await screen.findByRole('listbox');
    expect(await within(list).findByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(within(list).queryByText('Seller')).not.toBeInTheDocument();
    expect(sellerSearchSpy).not.toHaveBeenCalled();
  });

  it('navigates to the seller profile when its row is clicked', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'iphone');
    await user.click(await screen.findByText('iPhone Zone'));

    expect(screen.getByTestId('location')).toHaveTextContent('/profile/usr_1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the highlighted row on Enter after arrowing down', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'iphone');
    await screen.findByText('iPhone 15 Pro');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/product/prod_1');
  });

  it('still submits to the marketplace when no row is highlighted', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'iphone{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/marketplace?search=iphone'),
    );
  });
});
