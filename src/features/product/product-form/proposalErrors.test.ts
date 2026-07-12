import { describe, expect, it } from 'vitest';
import { proposalErrorMessage } from './proposalErrors';

describe('proposalErrorMessage', () => {
  it('maps a 409 to the duplicate-or-pending message per kind (SEC-L3)', () => {
    expect(proposalErrorMessage('brand', { statusCode: 409, status: 409, message: 'Conflict' }))
      .toBe('Thương hiệu này đã tồn tại hoặc đang chờ duyệt.');
    expect(proposalErrorMessage('category', { statusCode: 409, status: 409, message: 'Conflict' }))
      .toBe('Danh mục này đã tồn tại hoặc đang chờ duyệt.');
  });

  it('recognizes 409 via the legacy `status` field alone', () => {
    expect(proposalErrorMessage('brand', { status: 409 })).toBe(
      'Thương hiệu này đã tồn tại hoặc đang chờ duyệt.',
    );
  });

  it('falls back to the generic retry message for other statuses', () => {
    expect(proposalErrorMessage('brand', { statusCode: 500, status: 500, message: 'boom' }))
      .toBe('Không thể tạo thương hiệu. Thử lại sau.');
    expect(proposalErrorMessage('category', { statusCode: 400, status: 400, message: 'bad' }))
      .toBe('Không thể tạo danh mục. Thử lại sau.');
  });

  it('falls back for non-ApiError values (network TypeError, undefined)', () => {
    expect(proposalErrorMessage('brand', new TypeError('fetch failed')))
      .toBe('Không thể tạo thương hiệu. Thử lại sau.');
    expect(proposalErrorMessage('category', undefined))
      .toBe('Không thể tạo danh mục. Thử lại sau.');
  });
});
