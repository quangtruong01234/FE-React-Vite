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

export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [saved, setSaved] = useState<Theme | null>(() => readSavedTheme());
  const prefersLight = useSyncExternalStore(subscribeToScheme, readPrefersLight, () => false);
  const theme: Theme = resolveTheme(saved, prefersLight);

  // index.html already set the first paint; this keeps <html> in step afterwards.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setSaved(next);
    writeSavedTheme(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
