import { describe, it, expect } from 'vitest';
import { reportPostErrorMessage } from './reportPostError';

describe('reportPostErrorMessage', () => {
  it('maps 409 to the duplicate-report message', () => {
    expect(reportPostErrorMessage({ statusCode: 409 })).toBe('Bạn đã báo cáo bài viết này rồi.');
  });

  it('maps 400 to the self-report message', () => {
    expect(reportPostErrorMessage({ statusCode: 400 })).toBe('Không thể báo cáo bài viết của chính bạn.');
  });

  it('maps 429 to the rate-limit message', () => {
    expect(reportPostErrorMessage({ statusCode: 429 })).toBe('Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
  });

  it('falls back to the server message for other statuses', () => {
    expect(reportPostErrorMessage({ statusCode: 500, message: 'Server down' })).toBe('Server down');
  });

  it('uses a generic message when nothing usable is present', () => {
    expect(reportPostErrorMessage(null)).toBe('Báo cáo thất bại. Vui lòng thử lại.');
    expect(reportPostErrorMessage({ statusCode: 503 })).toBe('Báo cáo thất bại. Vui lòng thử lại.');
  });
});
