import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { usePageParam, parsePageParam } from './usePageParam';

function wrapperWith(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('parsePageParam', () => {
  it('parses a positive integer', () => {
    expect(parsePageParam('2')).toBe(2);
    expect(parsePageParam('17')).toBe(17);
  });

  it('falls back to 1 for missing or invalid values', () => {
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam('')).toBe(1);
    expect(parsePageParam('0')).toBe(1);
    expect(parsePageParam('-3')).toBe(1);
    expect(parsePageParam('2.5')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
  });
});

describe('usePageParam', () => {
  it('reads the page from the URL, defaulting to 1', () => {
    const { result } = renderHook(() => usePageParam(), {
      wrapper: wrapperWith('/list'),
    });
    expect(result.current[0]).toBe(1);

    const { result: withPage } = renderHook(() => usePageParam(), {
      wrapper: wrapperWith('/list?page=3'),
    });
    expect(withPage.current[0]).toBe(3);
  });

  it('setting a page > 1 writes ?page= and re-renders with the new value', () => {
    const { result } = renderHook(() => usePageParam(), {
      wrapper: wrapperWith('/list'),
    });
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
  });

  it('setting page 1 removes the param instead of writing ?page=1', () => {
    const { result } = renderHook(() => {
      const pageState = usePageParam();
      return pageState;
    }, { wrapper: wrapperWith('/list?page=4&status=pending') });

    act(() => result.current[1](1));
    expect(result.current[0]).toBe(1);
  });

  it('supports a custom param name so two lists on one page stay independent', () => {
    const { result } = renderHook(
      () => ({ posts: usePageParam('postsPage'), products: usePageParam('productsPage') }),
      { wrapper: wrapperWith('/profile/7?postsPage=2') },
    );
    expect(result.current.posts[0]).toBe(2);
    expect(result.current.products[0]).toBe(1);

    act(() => result.current.products[1](3));
    expect(result.current.posts[0]).toBe(2);
    expect(result.current.products[0]).toBe(3);
  });
});
