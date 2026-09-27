import { createContext } from 'react';
import type { Theme } from '@/lib/theme/theme';

export interface ThemeContextValue {
  theme: Theme;
  /** Saves the choice on this machine; from then on it wins over the OS setting. */
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** False in production until THEME-06 — the switches render nothing then. */
  isSwitchEnabled: boolean;
}

/** Apart from `ThemeContext.tsx` for Fast Refresh — see `authContextValue.ts`. */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
