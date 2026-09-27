import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ThemeToggleButton } from '@/features/auth/ThemeToggleButton';
import { THEME_STORAGE_KEY } from '@/lib/theme/theme';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';

/** jsdom has no matchMedia; this one also lets a test flip the OS setting live. */
function stubOsScheme(light: boolean): { setLight: (next: boolean) => void } {
  let matches = light;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
  }));
  return {
    setLight: (next) => {
      matches = next;
      listeners.forEach((fn) => fn());
    },
  };
}

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeProvider', () => {
  it('follows the OS setting while nothing is saved, including a live change', () => {
    const os = stubOsScheme(true);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => os.setLight(false));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('lets the saved choice win over the OS setting', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    stubOsScheme(true);
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
  });

  it('saves a switch, which then outlives an OS change', () => {
    const os = stubOsScheme(false);
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme('light'));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => os.setLight(false));
    expect(result.current.theme).toBe('light');
  });

  it('throws when useTheme is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within ThemeProvider');
  });
});

describe('ThemeToggleButton', () => {
  it('names the theme it switches to, and flips it on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggleButton />, { wrapper });

    await user.click(screen.getByRole('button', { name: 'Chuyển sang giao diện sáng' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Chuyển sang giao diện tối' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
