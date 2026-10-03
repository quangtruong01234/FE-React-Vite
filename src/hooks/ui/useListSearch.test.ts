import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useListSearch, listSearchEmptyText } from './useListSearch';

describe('useListSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('debounces the trimmed term and reports pending until it lands', () => {
    const { result } = renderHook(() => useListSearch(undefined, 400));

    act(() => result.current.setInput('  SALE '));
    expect(result.current.input).toBe('  SALE ');
    expect(result.current.term).toBe('');
    expect(result.current.pending).toBe(true);

    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current.term).toBe('SALE');
    expect(result.current.pending).toBe(false);
  });

  it('is not pending for whitespace-only input', () => {
    const { result } = renderHook(() => useListSearch());
    act(() => result.current.setInput('   '));
    expect(result.current.pending).toBe(false);
    expect(result.current.term).toBe('');
  });

  it('runs onInput on every change so the caller can reset its page', () => {
    const onInput = vi.fn();
    const { result } = renderHook(() => useListSearch(onInput));
    act(() => result.current.setInput('a'));
    act(() => result.current.setInput('ab'));
    expect(onInput).toHaveBeenCalledTimes(2);
  });
});

describe('listSearchEmptyText', () => {
  it('says it is searching while the term is pending', () => {
    expect(listSearchEmptyText({ term: '', pending: true }, 'đơn hàng')).toBe('Đang tìm…');
  });

  it('names the noun and term when a search found nothing', () => {
    expect(listSearchEmptyText({ term: 'abc', pending: false }, 'đơn hàng')).toBe(
      'Không tìm thấy đơn hàng nào khớp “abc”',
    );
  });

  it('returns null with no active search so the caller shows its own copy', () => {
    expect(listSearchEmptyText({ term: '', pending: false }, 'đơn hàng')).toBeNull();
  });
});

describe('listSearchEmptyText in English', () => {
  it('translates the searching and no-match lines', () => {
    expect(listSearchEmptyText({ term: '', pending: true }, 'posts', 'en')).toBe('Searching…');
    expect(listSearchEmptyText({ term: 'abc', pending: false }, 'posts', 'en')).toBe(
      'No posts match “abc”',
    );
  });
});
