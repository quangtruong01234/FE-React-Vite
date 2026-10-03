import { afterEach, describe, expect, it } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/shared/LanguageSwitch';
import { Pagination } from '@/components/shared/Pagination';
import { LANG_STORAGE_KEY } from '@/lib/i18n/lang';
import { LanguageProvider } from './LanguageContext';
import { useLanguage } from './useLanguage';

const wrapper = ({ children }: { children: ReactNode }) => <LanguageProvider>{children}</LanguageProvider>;

afterEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('LanguageProvider', () => {
  it('starts in Vietnamese when nothing is saved, whatever the browser language', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.lang).toBe('vi');
    expect(document.documentElement.lang).toBe('vi');
  });

  it('restores the saved choice', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('ignores a saved value that is not a language', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.lang).toBe('vi');
  });

  it('saves a switch and moves <html lang> with it', () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.setLang('en'));
    expect(result.current.lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
  });
});

describe('without a provider', () => {
  it('reads Vietnamese, so a component test needs no wrapper', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.lang).toBe('vi');
  });
});

describe('LanguageSwitch', () => {
  it('re-renders translated copy across the tree when EN is picked', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageSwitch />
        <Pagination page={2} totalPages={3} onPageChange={() => {}} />
      </LanguageProvider>,
    );

    const group = screen.getByRole('radiogroup', { name: 'Ngôn ngữ' });
    expect(screen.getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'English' }));

    expect(group).toHaveAccessibleName('Language');
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument();
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
  });

  it('names each option in its own language, so either reader finds theirs', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    render(<LanguageProvider><LanguageSwitch /></LanguageProvider>);
    expect(screen.getByRole('radio', { name: 'Tiếng Việt' })).toHaveAttribute('lang', 'vi');
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('lang', 'en');
  });
});
