import { describe, it, expect } from 'vitest';
import css from '../../index.css?raw';
import {
  CHART_CATEGORICAL_PALETTE,
  CHART_DOT_CLASS,
  CHART_PALETTES,
  ORDER_STATUS_CHART_COLOR,
  categoricalColor,
  withAlpha,
  type ChartColor,
  type ChartPalette,
} from './chartTheme';
import { ORDER_STATUSES } from '@/lib/domain/orderStatus';
import { type ColorConfig, flattenColors, LIGHT_THEME, parseCustomProperties } from '@/test/themeTokens';

describe('ORDER_STATUS_CHART_COLOR', () => {
  it('gives every order status a colour both palettes can resolve', () => {
    for (const status of ORDER_STATUSES) {
      const color = ORDER_STATUS_CHART_COLOR[status];
      expect(CHART_PALETTES.dark.series[color], status).toMatch(/^#[0-9A-F]{6}$/);
      expect(CHART_PALETTES.light.series[color], status).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe('CHART_PALETTES mirror src/index.css (THEME-05)', () => {
  // Canvas colours cannot read a CSS variable, so each hex is a copy of one. This is the
  // check that the copy is still right: every palette entry, in both themes, must equal
  // the variable behind the Tailwind token it stands for.
  const configs = import.meta.glob<{ theme: { extend: { colors: ColorConfig } } }>(
    '../../../tailwind.config.js',
    { eager: true, import: 'default' },
  );
  const [config] = Object.values(configs);
  if (!config) throw new Error('tailwind.config.js was not found');
  const tokens = flattenColors(config.theme.extend.colors);
  const themes = { dark: parseCustomProperties(css, ':root'), light: parseCustomProperties(css, LIGHT_THEME) };

  /** `accent-amber` → the hex its variable holds in `theme`, e.g. `#F59E0B`. */
  const tokenHex = (token: string, theme: keyof typeof themes): string => {
    const variable = /var\((--[\w-]+)\)/.exec(tokens[token] ?? '')?.[1];
    const channels = variable ? themes[theme][variable] : undefined;
    if (!channels) throw new Error(`${token} has no channels in ${theme}`);
    return `#${channels
      .split(' ')
      .map((channel) => Number(channel).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  };

  const chrome: Record<Exclude<keyof ChartPalette, 'series'>, string> = {
    surface: 'canvas-elevated',
    grid: 'bdr',
    inkPri: 'ink-pri',
    inkSec: 'ink-sec',
  };

  it.each(['dark', 'light'] as const)('matches the %s theme, chrome and series', (theme) => {
    const palette = CHART_PALETTES[theme];
    for (const [key, token] of Object.entries(chrome)) {
      expect(palette[key as keyof typeof chrome], key).toBe(tokenHex(token, theme));
    }
    // The legend dot's class names the token; the canvas colour must be that token's value,
    // or the legend and the arc disagree.
    for (const [color, dotClass] of Object.entries(CHART_DOT_CLASS)) {
      expect(palette.series[color as ChartColor], color).toBe(tokenHex(dotClass.replace(/^bg-/, ''), theme));
    }
  });

  it('actually differs between the themes, so a switch repaints', () => {
    expect(CHART_PALETTES.light.surface).not.toBe(CHART_PALETTES.dark.surface);
    expect(CHART_PALETTES.light.series.amber).not.toBe(CHART_PALETTES.dark.series.amber);
  });
});

describe('categoricalColor', () => {
  it('walks the palette in order', () => {
    expect(categoricalColor(0)).toBe(CHART_CATEGORICAL_PALETTE[0]);
    expect(categoricalColor(2)).toBe(CHART_CATEGORICAL_PALETTE[2]);
  });

  it('wraps once a series outruns the palette', () => {
    const len = CHART_CATEGORICAL_PALETTE.length;
    expect(categoricalColor(len)).toBe(CHART_CATEGORICAL_PALETTE[0]);
    expect(categoricalColor(len + 3)).toBe(CHART_CATEGORICAL_PALETTE[3]);
  });

  it('stays in bounds for a negative index', () => {
    // Plain `index % len` keeps the sign in JS and would index out of bounds.
    expect(categoricalColor(-1)).toBe(
      CHART_CATEGORICAL_PALETTE[CHART_CATEGORICAL_PALETTE.length - 1],
    );
  });
});

describe('withAlpha', () => {
  it('converts a 6-digit hex to rgba', () => {
    expect(withAlpha('#F59E0B', 0.35)).toBe('rgba(245, 158, 11, 0.35)');
  });

  it('handles pure black without dropping channels', () => {
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
  });

  it('clamps an out-of-range alpha', () => {
    expect(withAlpha(CHART_PALETTES.dark.series.amber, 4)).toBe('rgba(245, 158, 11, 1)');
    expect(withAlpha(CHART_PALETTES.dark.series.amber, -2)).toBe('rgba(245, 158, 11, 0)');
  });

  it('returns the input unchanged when it is not a 6-digit hex', () => {
    expect(withAlpha('rgba(1, 2, 3, 0.5)', 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });
});
