import { type ReactElement } from 'react';
import { Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { useTheme } from '@/context/useTheme';

/**
 * The signed-out theme switch (THEME-03) — `/login` has no ProfileMenu. The icon shows the
 * theme a click switches *to*.
 */
export function ThemeToggleButton(): ReactElement {
  const { theme, toggleTheme } = useTheme();

  const toLight = theme === 'dark';
  return (
    <IconButton
      aria-label={toLight ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      onClick={toggleTheme}
      className="absolute top-4 right-4 z-10 size-9 rounded-full bg-canvas-surface border border-bdr text-ink-sec hover:text-ink-pri hover:bg-canvas-elevated transition-colors shrink-0"
    >
      {toLight ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
    </IconButton>
  );
}
