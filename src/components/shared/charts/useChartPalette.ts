import { useContext } from 'react';
import { ThemeContext } from '@/context/themeContextValue';
import { CHART_PALETTES, type ChartPalette } from '@/lib/chart/chartTheme';

/**
 * The chart palette of the active theme (THEME-05). The object is one of the two
 * `CHART_PALETTES` constants, so it only changes identity when the theme does —
 * put it in a chart's `useMemo` deps and the chart redraws on a theme switch,
 * and on nothing else.
 *
 * Reads the context directly rather than through `useTheme()`, which throws
 * outside `ThemeProvider`: a chart rendered without one (a page test) paints the
 * dark palette, the one production shows while the switch is off.
 */
export function useChartPalette(): ChartPalette {
  const theme = useContext(ThemeContext)?.theme ?? 'dark';
  return CHART_PALETTES[theme];
}
