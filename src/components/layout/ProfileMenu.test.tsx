import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { LANG_STORAGE_KEY } from '@/lib/i18n/lang';
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

function renderMenu() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ProfileMenu />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.lang = '';
});

describe('ProfileMenu theme switch', () => {
  it('switches to the light theme and remembers it', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Menu tài khoản' }));

    const toggle = screen.getByRole('switch', { name: 'Giao diện sáng' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});

describe('ProfileMenu language switch', () => {
  it('turns the menu English and remembers the choice', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ThemeProvider>
            <ProfileMenu />
          </ThemeProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Menu tài khoản' }));
    expect(screen.getByRole('button', { name: /Đơn mua/ })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'English' }));

    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /My orders/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Light theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Log out/ })).toBeInTheDocument();
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
