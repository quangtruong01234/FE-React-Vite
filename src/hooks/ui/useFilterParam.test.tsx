import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { useFilterParam, parseFilterParam } from './useFilterParam';
import { usePageParam } from './usePageParam';

const TABS = ['all', 'pending', 'done'] as const;
type Tab = (typeof TABS)[number];

function wrapperWith(initialEntry: string) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('parseFilterParam', () => {
  it('accepts an allowed value', () => {
    expect(parseFilterParam('pending', TABS, 'all')).toBe('pending');
  });

  it('falls back for missing or tampered values', () => {
    expect(parseFilterParam(null, TABS, 'all')).toBe('all');
    expect(parseFilterParam('hacked', TABS, 'all')).toBe('all');
    expect(parseFilterParam('', TABS, 'all')).toBe('all');
  });
});

describe('useFilterParam', () => {
  it('reads the filter from the URL, defaulting when absent', () => {
    const { result } = renderHook(() => useFilterParam<Tab>('status', TABS, 'all'), {
      wrapper: wrapperWith('/list?status=done'),
    });
    expect(result.current[0]).toBe('done');

    const { result: absent } = renderHook(() => useFilterParam<Tab>('status', TABS, 'all'), {
      wrapper: wrapperWith('/list'),
    });
    expect(absent.current[0]).toBe('all');
  });

  it('setting a non-default value writes the param', () => {
    const { result } = renderHook(() => useFilterParam<Tab>('status', TABS, 'all'), {
      wrapper: wrapperWith('/list'),
    });
    act(() => result.current[1]('pending'));
    expect(result.current[0]).toBe('pending');
  });

  it('changing the filter resets the page param in the same update', () => {
    const { result } = renderHook(
      () => ({
        filter: useFilterParam<Tab>('status', TABS, 'all'),
        page: usePageParam(),
      }),
      { wrapper: wrapperWith('/list?status=pending&page=4') },
    );
    expect(result.current.page[0]).toBe(4);

    act(() => result.current.filter[1]('done'));
    expect(result.current.filter[0]).toBe('done');
    expect(result.current.page[0]).toBe(1);
  });

  it('setting the default value removes the param', () => {
    const { result } = renderHook(() => useFilterParam<Tab>('status', TABS, 'all'), {
      wrapper: wrapperWith('/list?status=pending'),
    });
    act(() => result.current[1]('all'));
    expect(result.current[0]).toBe('all');
  });
});
