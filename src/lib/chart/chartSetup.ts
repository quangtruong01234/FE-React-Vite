import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { CHART_FONT_BODY, CHART_INK_SEC } from './chartTheme';

/**
 * Chart.js v4 ships tree-shakeable: nothing renders until the pieces are
 * registered. Registering the exact set the app uses — rather than importing
 * the `chart.js/auto` bundle — keeps the scales, controllers and plugins we do
 * not draw (radar, polar area, bubble, the Legend plugin) out of the chunk.
 *
 * Legend is deliberately absent: every chart in this app renders its own legend
 * as real DOM (see `ChartLegend`), which stays selectable, screen-reader
 * readable and Tailwind-styled — none of which a canvas-painted legend is.
 *
 * Import this module once for its side effect before rendering any chart;
 * `registerCharts()` is exported for tests that need to be explicit about it.
 */
let registered = false;

export function registerCharts(): void {
  if (registered) return;
  ChartJS.register(
    ArcElement,
    BarElement,
    CategoryScale,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
  );

  ChartJS.defaults.font.family = CHART_FONT_BODY;
  ChartJS.defaults.font.size = 11;
  ChartJS.defaults.color = CHART_INK_SEC;
  // Charts here live inside fixed-height frames, so let them fill the box.
  ChartJS.defaults.maintainAspectRatio = false;
  registered = true;
}

registerCharts();
