import { describe, it, expect } from 'vitest';
import { orderLoadError } from './orderDetailError';

describe('orderLoadError', () => {
  it('returns null when there is no error (order simply absent)', () => {
    expect(orderLoadError(null)).toBeNull();
    expect(orderLoadError(undefined)).toBeNull();
  });

  it('returns null for a 404 so the page shows its not-found state (BUG-404-01)', () => {
    expect(orderLoadError({ statusCode: 404, status: 404, message: 'Order ord_x not found' })).toBeNull();
  });

  it('keeps a 403 as a real error instead of "không tìm thấy đơn hàng"', () => {
    expect(orderLoadError({ statusCode: 403, status: 403, message: 'You do not have access to this order' })).toEqual({
      statusCode: 403,
      status: 403,
      message: 'You do not have access to this order',
    });
  });

  it('keeps a 500 as a server error', () => {
    expect(orderLoadError({ statusCode: 500, status: 500, message: 'Internal server error' })).toEqual({
      statusCode: 500,
      status: 500,
      message: 'Internal server error',
    });
  });

  it('normalises a rejected fetch to the offline status and drops its raw message', () => {
    expect(orderLoadError(new TypeError('Failed to fetch'))).toEqual({
      statusCode: 0,
      status: 0,
      message: '',
    });
  });
});
