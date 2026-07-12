import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/types';
import { isStaleCartItemError } from './cartItemErrors';

const apiError = (statusCode: number): ApiError => ({
  statusCode,
  status: statusCode,
  message: 'boom',
});

describe('isStaleCartItemError', () => {
  it('is true for a 404 ApiError (stale/foreign cart item id)', () => {
    expect(isStaleCartItemError(apiError(404))).toBe(true);
  });

  it('is false for other status codes', () => {
    expect(isStaleCartItemError(apiError(400))).toBe(false);
    expect(isStaleCartItemError(apiError(409))).toBe(false);
    expect(isStaleCartItemError(apiError(500))).toBe(false);
  });

  it('is false for non-ApiError values', () => {
    expect(isStaleCartItemError(null)).toBe(false);
    expect(isStaleCartItemError(undefined)).toBe(false);
    expect(isStaleCartItemError('404')).toBe(false);
    expect(isStaleCartItemError(new Error('nope'))).toBe(false);
    expect(isStaleCartItemError({})).toBe(false);
  });
});
