import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { THEME_STORAGE_KEY } from '@/lib/theme/theme';
import { ProfileMenu } from './ProfileMenu';

vi.mock('@/hooks/auth/useRole', () => ({
  useRole: () => ({
    me: { id: 'usr_test', username: 'buyer', email: 'buyer@example.com', avatar: null },
    isSeller: false,
    isAdmin: false,
  }),
}));
vi.mock('@/context/useAuthContext', () => ({ useAuthContext: () => ({ logout: vi.fn() }) }));

function renderMenu(isEnabled: boolean) {
  return render(
    <MemoryRouter>
      <ThemeProvider isEnabled={isEnabled}>
        <ProfileMenu />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ProfileMenu theme switch', () => {
  it('switches to the light theme and remembers it', async () => {
    const user = userEvent.setup();
    renderMenu(true);
    await user.click(screen.getByRole('button', { name: 'Menu tài khoản' }));

    const toggle = screen.getByRole('switch', { name: 'Giao diện sáng' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('has no switch while it is dev-only and this is production', async () => {
    const user = userEvent.setup();
    renderMenu(false);
    await user.click(screen.getByRole('button', { name: 'Menu tài khoản' }));

    expect(screen.getByRole('button', { name: /Đăng xuất/ })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
