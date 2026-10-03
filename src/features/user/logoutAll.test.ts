import { describe, it, expect } from 'vitest';
import { logoutAllErrorMessage } from './logoutAll';

describe('logoutAllErrorMessage (SESSION-REVOKE-01)', () => {
  it('503 says nothing was revoked and to retry later', () => {
    const message = logoutAllErrorMessage({ statusCode: 503, message: 'Service Unavailable' });
    expect(message).toContain('chưa thiết bị nào bị đăng xuất');
    expect(message).toContain('thử lại sau');
  });

  it('429 is the rate-limit message', () => {
    expect(logoutAllErrorMessage({ statusCode: 429 })).toContain('quá nhiều lần');
  });

  it('reads `status` when `statusCode` is absent', () => {
    expect(logoutAllErrorMessage({ status: 429 })).toContain('quá nhiều lần');
  });

  it('404 from a backend without the route reads as not available yet', () => {
    expect(logoutAllErrorMessage({ statusCode: 404 })).toContain('chưa khả dụng');
  });

  it('anything else falls back to the network message', () => {
    expect(logoutAllErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
    );
    expect(logoutAllErrorMessage(undefined)).toBe('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
  });
});

describe('logoutAllErrorMessage — English (I18N-02)', () => {
  it('speaks the requested language', () => {
    expect(logoutAllErrorMessage({ statusCode: 503, status: 503, message: '' }, 'en')).toMatch(
      /no device was signed out/,
    );
    expect(logoutAllErrorMessage(undefined, 'en')).toBe('Cannot reach the server. Please try again.');
  });
});
