import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import { API_BASE } from '@/test/msw/handlers';
import { renderWithProviders } from '@/test/renderWithProviders';
import AdminPage from './AdminPage';
import type { OrderAnalytics, User } from '@/types';

/**
 * The role control on the admin users table (ROLE-ADMIN-01). Covers the parts
 * that only exist in the component: the confirm modal, the request body, the
 * re-login notice, and the two read-only rows.
 */

const ADMIN_ID = 'usr_admin';

function user(overrides: Partial<User> & Pick<User, 'id' | 'username'>): User {
  return {
    email: `${overrides.username}@example.com`,
    isActive: true,
    role: { id: 1, name: 'user' },
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

const rows: User[] = [
  user({ id: 'usr_bob', username: 'bob', name: 'Bob Tran' }),
  user({ id: ADMIN_ID, username: 'admin1', role: { id: 3, name: 'admin' } }),
  user({ id: 'usr_ghn', username: 'ghn1', role: { id: 4, name: 'logistics_operator' } }),
  // A row written before NAME-TRIM-01: `username` is whitespace, `name` unset.
  // Such rows exist on the running stack and are not backfilled.
  user({ id: 'usr_blank', username: '   ' }),
];

const emptyAnalytics: OrderAnalytics = {
  scope: 'global',
  from: '2026-08-16',
  to: '2026-09-15',
  interval: 'day',
  summary: { totalRevenue: 0, completedOrders: 0, totalOrders: 0, averageOrderValue: 0 },
  revenueOverTime: [],
  // Empty distribution keeps `ChartFrame` in its empty state, so no canvas mounts.
  statusDistribution: {} as OrderAnalytics['statusDistribution'],
  topProducts: [],
};

/** Every request AdminPage makes, minus the one under test. */
function stubPageQueries(): void {
  server.use(
    http.get(`${API_BASE}/user/me`, () =>
      HttpResponse.json({ data: rows.find((row) => row.id === ADMIN_ID) }),
    ),
    http.get(`${API_BASE}/order/admin/orders`, () =>
      HttpResponse.json({ data: { data: [], total: 0, page: 1, limit: 10, totalPages: 1 } }),
    ),
    http.get(`${API_BASE}/order/admin/analytics`, () =>
      HttpResponse.json({ data: emptyAnalytics }),
    ),
    http.get(`${API_BASE}/user`, () =>
      HttpResponse.json({ data: { data: rows, total: rows.length, page: 1, limit: 20, totalPages: 1 } }),
    ),
  );
}

describe('AdminPage — role control', () => {
  beforeEach(() => {
    stubPageQueries();
  });

  /** Picks a role and answers the confirm modal. Returns the modal's dialog. */
  async function pickRole(name: string, role: string): Promise<HTMLElement> {
    const select = await screen.findByRole('combobox', { name: `Vai trò của ${name}` });
    await userEvent.selectOptions(select, role);
    return screen.getByRole('dialog');
  }

  it('offers only the three storefront roles, labelled in Vietnamese', async () => {
    renderWithProviders(<AdminPage />, { route: '/admin' });

    const select = await screen.findByRole('combobox', { name: 'Vai trò của bob' });
    const labels = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(labels).toEqual(['Người mua', 'Người bán', 'Quản trị']);
  });

  it('sends the raw role name and warns that the target must log in again', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${API_BASE}/user/usr_bob/role`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          data: { ...rows[0], role: { id: 2, name: 'shop' } },
        });
      }),
    );

    renderWithProviders(<AdminPage />, { route: '/admin' });
    const dialog = await pickRole('bob', 'shop');

    // The warning is on screen *before* the request goes out — that is the
    // whole point of asking.
    expect(dialog).toHaveTextContent('Đổi vai trò của Bob Tran thành "Người bán"?');
    expect(dialog).toHaveTextContent('đăng xuất và đăng nhập lại');
    expect(bodies).toEqual([]);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Đổi vai trò' }));

    await waitFor(() => expect(bodies).toEqual([{ role: 'shop' }]));
    const notice = await screen.findByText(/Đã đặt vai trò của Bob Tran/);
    expect(notice).toHaveTextContent('chỉ có hiệu lực sau khi người dùng đăng xuất và đăng nhập lại');
    // The modal closes itself on success; the notice above the table is the receipt.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('fires nothing when the admin cancels the confirm', async () => {
    let calls = 0;
    server.use(
      http.patch(`${API_BASE}/user/usr_bob/role`, () => {
        calls += 1;
        return HttpResponse.json({ data: rows[0] });
      }),
    );

    renderWithProviders(<AdminPage />, { route: '/admin' });
    const dialog = await pickRole('bob', 'shop');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toBe(0);
    expect(screen.queryByText(/Đã đặt vai trò/)).not.toBeInTheDocument();
    // The select is controlled by the row, so a cancelled pick snaps back.
    expect(screen.getByRole('combobox', { name: 'Vai trò của bob' })).toHaveValue('user');
  });

  it('asks before an admin promotion too — no silent privilege grant', async () => {
    renderWithProviders(<AdminPage />, { route: '/admin' });
    const dialog = await pickRole('bob', 'admin');

    expect(dialog).toHaveTextContent('Đổi vai trò của Bob Tran thành "Quản trị"?');
  });

  it('renders the own row and the GHN row read-only', async () => {
    renderWithProviders(<AdminPage />, { route: '/admin' });

    await screen.findByRole('combobox', { name: 'Vai trò của bob' });
    expect(screen.queryByRole('combobox', { name: 'Vai trò của admin1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Vai trò của ghn1' })).not.toBeInTheDocument();
    // Matched by the `title` reason, not the label: "Quản trị" is also an
    // `<option>` inside every editable row's select.
    expect(screen.getByTitle(/tự đổi vai trò/)).toHaveTextContent('Quản trị');
    expect(screen.getByTitle(/GHN console/)).toHaveTextContent('Vận hành GHN');
  });

  // Found while verifying this table in a real browser: the label was built as
  // `Vai trò của ${user.username}`, so a pre-NAME-TRIM-01 row announced the
  // control as "Vai trò của " — a select with no subject. Falling back to the
  // public id keeps it tied to the row's own first column.
  it('names the control by public id when the username is only whitespace', async () => {
    renderWithProviders(<AdminPage />, { route: '/admin' });

    expect(
      await screen.findByRole('combobox', { name: 'Vai trò của usr_blank' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Vai trò của' })).not.toBeInTheDocument();
  });

  // Same pre-NAME-TRIM-01 row, the display half of the bug: the cell rendered
  // the raw `username`, so it came out empty. The fallback is an em dash, NOT
  // `userDisplayName()` — that helper prefers `name`, and this column is
  // labelled USERNAME, so it would print the wrong field for every row that has
  // a display name (`usr_bob` would read "Bob Tran").
  it('falls back to an em dash when the username has nothing visible in it', async () => {
    renderWithProviders(<AdminPage />, { route: '/admin' });

    const blankRow = (await screen.findByText('usr_blank')).closest('tr');
    expect(blankRow).toContainElement(screen.getByText('—'));

    // The other rows keep showing their own username, not their display name.
    const bobRow = screen.getByText('usr_bob').closest('tr');
    expect(bobRow).toContainElement(screen.getByText('bob'));
    expect(screen.queryByText('Bob Tran')).not.toBeInTheDocument();
  });

  it('surfaces the backend refusal instead of a success notice', async () => {
    server.use(
      http.patch(`${API_BASE}/user/usr_bob/role`, () =>
        HttpResponse.json({ statusCode: 400, message: 'Role "shop" is not active' }, { status: 400 }),
      ),
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<AdminPage />, { route: '/admin' });
    const dialog = await pickRole('bob', 'shop');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đổi vai trò' }));

    expect(await screen.findByText('Role "shop" is not active')).toBeInTheDocument();
    expect(screen.queryByText(/Đã đặt vai trò/)).not.toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
