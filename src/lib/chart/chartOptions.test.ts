import { describe, it, expect } from 'vitest';
import { trendPointRadius, truncateLabel } from './chartOptions';

describe('trendPointRadius', () => {
  // The bug this guards: a range with a single period rendered axes and an
  // empty plot, because a line segment needs two points and the points were
  // hidden. Caught on /admin with one day of revenue in the window.
  it('marks the point when there is only one', () => {
    expect(trendPointRadius(1, false)).toBeGreaterThan(0);
  });

  it('marks nothing when the series can draw a line', () => {
    expect(trendPointRadius(2, false)).toBe(0);
    expect(trendPointRadius(90, false)).toBe(0);
  });

  it('stays hidden in compact mode even for a lone point', () => {
    // A sparkline has no room for a marker and no hover affordance.
    expect(trendPointRadius(1, true)).toBe(0);
  });

  it('draws nothing for an empty series', () => {
    // Nothing to mark; the frame shows its empty state instead.
    expect(trendPointRadius(0, false)).toBeGreaterThanOrEqual(0);
  });
});

describe('truncateLabel', () => {
  it('leaves a label that already fits untouched', () => {
    expect(truncateLabel('Sony WF-1000XM5', 18)).toBe('Sony WF-1000XM5');
  });

  it('adds no ellipsis at exactly the limit', () => {
    expect(truncateLabel('123456789012345678', 18)).toBe('123456789012345678');
  });

  it('ellipsises past the limit without a dangling space', () => {
    expect(truncateLabel('Microsoft Surface Laptop 5', 10)).toBe('Microsoft…');
  });

  it('trims surrounding whitespace before measuring', () => {
    expect(truncateLabel('  Anker 737  ', 18)).toBe('Anker 737');
  });
});
