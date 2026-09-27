import type { ReactElement, ReactNode } from 'react';
import { describe, it, expect } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { ThemeContext, type ThemeContextValue } from '@/context/themeContextValue';
import { CHART_PALETTES } from '@/lib/chart/chartTheme';
import type { Theme } from '@/lib/theme/theme';
import { ChartLegend } from './ChartLegend';
import { useChartPalette } from './useChartPalette';

function themeValue(theme: Theme): ThemeContextValue {
  return { theme, setTheme: () => undefined, toggleTheme: () => undefined };
}

describe('useChartPalette (THEME-05)', () => {
  it('follows the theme, and hands back a new object only when the theme changes', () => {
    let theme: Theme = 'dark';
    const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
      <ThemeContext.Provider value={themeValue(theme)}>{children}</ThemeContext.Provider>
    );
    const { result, rerender } = renderHook(() => useChartPalette(), { wrapper });
    const dark = result.current;
    expect(dark).toBe(CHART_PALETTES.dark);

    // Same theme, new context value: the palette must keep its identity, or every chart
    // would redraw (and replay its animation) on unrelated renders.
    rerender();
    expect(result.current).toBe(dark);

    // The identity change is what the charts' memo deps see: the redraw on a switch.
    theme = 'light';
    rerender();
    expect(result.current).toBe(CHART_PALETTES.light);
  });

  it('paints the dark palette without a ThemeProvider instead of throwing like useTheme()', () => {
    const { result } = renderHook(() => useChartPalette());
    expect(result.current).toBe(CHART_PALETTES.dark);
  });
});

describe('<ChartLegend>', () => {
  it('colours each dot with the token class of its role, not an inline hex', () => {
    render(
      <ChartLegend
        slices={[
          { key: 'a', label: 'Sắp hết', value: 1, color: 'amber' },
          { key: 'b', label: 'Mức tối thiểu', value: 1, color: 'muted' },
        ]}
      />,
    );
    const [amber, muted] = screen.getAllByTestId('chart-legend-dot');
    expect(amber).toHaveClass('bg-accent-amber');
    expect(muted).toHaveClass('bg-ink-muted');
    expect(amber).not.toHaveAttribute('style');
  });
});
