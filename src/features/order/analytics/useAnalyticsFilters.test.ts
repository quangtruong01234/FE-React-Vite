import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalyticsFilters } from './useAnalyticsFilters';

describe('useAnalyticsFilters', () => {
  it('defaults to daily interval with no explicit range', () => {
    const { result } = renderHook(() => useAnalyticsFilters());
    expect(result.current[0]).toEqual({ interval: 'day' });
  });

  it('replaces the filter state via the setter', () => {
    const { result } = renderHook(() => useAnalyticsFilters());
    act(() => {
      result.current[1]({ interval: 'month', from: '2026-06-01', to: '2026-07-01' });
    });
    expect(result.current[0]).toEqual({ interval: 'month', from: '2026-06-01', to: '2026-07-01' });
  });
});
