import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue(10, 400));
    expect(result.current).toBe(10);
  });

  it('only updates after the delay elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 400), {
      initialProps: { v: 0 },
    });

    rerender({ v: 5 });
    expect(result.current).toBe(0); // not yet

    act(() => { vi.advanceTimersByTime(399); });
    expect(result.current).toBe(0);

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe(5);
  });

  it('collapses rapid changes into a single final update', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 400), {
      initialProps: { v: 0 },
    });

    rerender({ v: 1 });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ v: 2 });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ v: 3 });
    expect(result.current).toBe(0); // never settled mid-flight

    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(3);
  });
});
