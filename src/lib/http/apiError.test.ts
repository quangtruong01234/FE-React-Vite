import { describe, it, expect } from 'vitest';
import { toApiError } from './apiError';

describe('toApiError', () => {
  it('returns null when there is no error', () => {
    expect(toApiError(null)).toBeNull();
    expect(toApiError(undefined)).toBeNull();
  });

  it('keeps a server status and message', () => {
    expect(toApiError({ statusCode: 403, message: 'Forbidden resource' })).toEqual({
      statusCode: 403,
      status: 403,
      message: 'Forbidden resource',
    });
  });

  it('maps a network rejection to the offline panel and drops its raw message', () => {
    expect(toApiError(new TypeError('Failed to fetch'))).toEqual({
      statusCode: 0,
      status: 0,
      message: '',
    });
  });

  it('survives a non-object rejection', () => {
    expect(toApiError('boom')).toEqual({ statusCode: 0, status: 0, message: '' });
  });

  it('ignores a non-string message', () => {
    expect(toApiError({ statusCode: 500, message: { nested: true } })).toEqual({
      statusCode: 500,
      status: 500,
      message: '',
    });
  });
});
