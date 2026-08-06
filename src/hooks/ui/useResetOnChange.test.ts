import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResetOnChange } from './useResetOnChange';

describe('useResetOnChange', () => {
  it('does not run reset on the initial render', () => {
    const reset = vi.fn();
    renderHook(({ key }) => useResetOnChange(key, reset), {
      initialProps: { key: 1 },
    });
    expect(reset).not.toHaveBeenCalled();
  });

  it('runs reset once when the key changes value', () => {
    const reset = vi.fn();
    const { rerender } = renderHook(({ key }) => useResetOnChange(key, reset), {
      initialProps: { key: 1 },
    });

    rerender({ key: 2 });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('does not run reset when the key stays the same across re-renders', () => {
    const reset = vi.fn();
    const { rerender } = renderHook(({ key }) => useResetOnChange(key, reset), {
      initialProps: { key: 'a' },
    });

    rerender({ key: 'a' });
    rerender({ key: 'a' });
    expect(reset).not.toHaveBeenCalled();
  });

  it('runs reset again on each distinct change', () => {
    const reset = vi.fn();
    const { rerender } = renderHook(({ key }) => useResetOnChange(key, reset), {
      initialProps: { key: 1 },
    });

    rerender({ key: 2 });
    rerender({ key: 2 }); // no change → no extra call
    rerender({ key: 3 });
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('treats NaN → NaN as unchanged (Object.is semantics)', () => {
    const reset = vi.fn();
    const { rerender } = renderHook(({ key }) => useResetOnChange(key, reset), {
      initialProps: { key: NaN },
    });

    rerender({ key: NaN });
    expect(reset).not.toHaveBeenCalled();
  });
});
