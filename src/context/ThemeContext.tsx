import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ThemeContext, type ThemeContextValue } from '@/context/themeContextValue';
import {
  applyTheme,
  LIGHT_SCHEME_QUERY,
  prefersLightScheme,
  readSavedTheme,
  resolveTheme,
  THEME_SWITCH_ENABLED,
  writeSavedTheme,
  type Theme,
} from '@/lib/theme/theme';

/** Re-render when the OS switches light/dark — it only matters while nothing is saved. */
function subscribeToScheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(LIGHT_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const readPrefersLight = (): boolean => prefersLightScheme();

interface ThemeProviderProps {
  children: ReactNode;
  /** Tests only — defaults to the dev-only gate. */
  isEnabled?: boolean;
}

export function ThemeProvider({
  children,
  isEnabled = THEME_SWITCH_ENABLED,
}: ThemeProviderProps): ReactElement {
  const [saved, setSaved] = useState<Theme | null>(() => readSavedTheme());
  const prefersLight = useSyncExternalStore(subscribeToScheme, readPrefersLight, () => false);
  const theme: Theme = isEnabled ? resolveTheme(saved, prefersLight) : 'dark';

  // index.html already set the first paint; this keeps <html> in step afterwards.
  // Disabled, it touches nothing — :root is the dark theme.
  useLayoutEffect(() => {
    if (isEnabled) applyTheme(theme);
  }, [isEnabled, theme]);

  const setTheme = useCallback((next: Theme) => {
    setSaved(next);
    writeSavedTheme(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
      isSwitchEnabled: isEnabled,
    }),
    [theme, setTheme, isEnabled],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
