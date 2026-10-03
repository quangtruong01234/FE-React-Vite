import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTimedToast } from './useTimedToast';

describe('useTimedToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty and clears the toast after the duration', () => {
    const { result } = renderHook(() => useTimedToast<string>(3000));
    expect(result.current.toast).toBeNull();

    act(() => result.current.showToast('Đã ẩn bài viết'));
    expect(result.current.toast).toBe('Đã ẩn bài viết');

    act(() => vi.advanceTimersByTime(2999));
    expect(result.current.toast).toBe('Đã ẩn bài viết');

    act(() => vi.advanceTimersByTime(1));
    expect(result.current.toast).toBeNull();
  });

  // TOAST-TIMER-01: the first toast's timer used to wipe the second one early.
  it('gives a second toast its own full duration', () => {
    const { result } = renderHook(() => useTimedToast<string>(3000));

    act(() => result.current.showToast('Đã ẩn bài viết'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.showToast('Đã hiện lại bài viết'));

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.toast).toBe('Đã hiện lại bài viết');

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.toast).toBeNull();
  });

  it('carries non-string payloads', () => {
    const { result } = renderHook(() => useTimedToast<{ id: number; msg: string }>(3000));

    act(() => result.current.showToast({ id: 7, msg: 'Đã duyệt' }));
    expect(result.current.toast).toEqual({ id: 7, msg: 'Đã duyệt' });
  });

  it('cancels the pending timer on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useTimedToast<string>(3000));

    act(() => result.current.showToast('x'));
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    clearSpy.mockRestore();
  });

  it('keeps showToast referentially stable across renders', () => {
    const { result, rerender } = renderHook(() => useTimedToast<string>(3000));
    const first = result.current.showToast;

    act(() => result.current.showToast('x'));
    rerender();

    expect(result.current.showToast).toBe(first);
  });
});
