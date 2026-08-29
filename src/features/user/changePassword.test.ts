import { describe, it, expect } from 'vitest';
import { changePasswordSchema, changePasswordError, changePasswordPayload } from './changePassword';

const valid = {
  currentPassword: 'oldpass1',
  newPassword: 'newpass1',
  confirmPassword: 'newpass1',
};

function firstIssue(data: Record<string, string>): { path: string; message: string } | undefined {
  const result = changePasswordSchema.safeParse(data);
  if (result.success) return undefined;
  const issue = result.error.issues[0];
  return { path: String(issue.path[0]), message: issue.message };
}

describe('changePasswordSchema', () => {
  it('accepts a well-formed change', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('requires the current password', () => {
    expect(firstIssue({ ...valid, currentPassword: '' })).toEqual({
      path: 'currentPassword',
      message: 'Vui lòng nhập mật khẩu hiện tại',
    });
  });

  it('enforces the 6-char minimum on the new password', () => {
    expect(firstIssue({ ...valid, newPassword: 'abc12', confirmPassword: 'abc12' })).toEqual({
      path: 'newPassword',
      message: 'Tối thiểu 6 ký tự',
    });
  });

  it('rejects a mismatched confirmation', () => {
    expect(firstIssue({ ...valid, confirmPassword: 'different1' })).toEqual({
      path: 'confirmPassword',
      message: 'Mật khẩu nhập lại không khớp',
    });
  });

  it('rejects a new password identical to the current one', () => {
    expect(
      firstIssue({ currentPassword: 'samepass', newPassword: 'samepass', confirmPassword: 'samepass' }),
    ).toEqual({ path: 'newPassword', message: 'Mật khẩu mới phải khác mật khẩu hiện tại' });
  });
});

describe('changePasswordPayload', () => {
  it('sends only the two fields the gateway whitelists', () => {
    expect(changePasswordPayload(valid)).toEqual({
      currentPassword: 'oldpass1',
      newPassword: 'newpass1',
    });
  });

  it('drops confirmPassword — an extra field makes the call a 400', () => {
    expect(Object.keys(changePasswordPayload(valid))).not.toContain('confirmPassword');
  });
});

describe('changePasswordError', () => {
  it('puts a 401 on the current-password field, not the form', () => {
    expect(
      changePasswordError({ statusCode: 401, status: 401, message: 'Current password is incorrect' }),
    ).toEqual({
      field: 'currentPassword',
      message: 'Mật khẩu hiện tại không đúng.',
    });
  });

  it('reads a dead session out of the guard’s own 401 wording', () => {
    expect(
      changePasswordError({ statusCode: 401, status: 401, message: 'Access token is required' }),
    ).toEqual({ field: 'root', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    expect(changePasswordError({ statusCode: 401, message: 'Unauthorized' }).field).toBe('root');
  });

  it('keeps a reworded wrong-password 401 on the password field', () => {
    expect(changePasswordError({ statusCode: 401, message: 'Mật khẩu cũ sai' }).field).toBe(
      'currentPassword',
    );
    expect(changePasswordError({ statusCode: 401 }).field).toBe('currentPassword');
  });

  it('treats 403 the same as 401', () => {
    expect(changePasswordError({ statusCode: 403, status: 403, message: 'Forbidden' }).field).toBe(
      'currentPassword',
    );
  });

  it('maps 429 to a rate-limit message on the form', () => {
    expect(changePasswordError({ statusCode: 429, status: 429, message: 'Too Many' })).toEqual({
      field: 'root',
      message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    });
  });

  it('maps 400 to the new-password field', () => {
    expect(changePasswordError({ statusCode: 400, status: 400, message: 'Bad Request' }).field).toBe(
      'newPassword',
    );
  });

  it('explains a 404 as the feature not being live yet', () => {
    expect(changePasswordError({ statusCode: 404, status: 404, message: 'Not Found' })).toEqual({
      field: 'root',
      message: 'Tính năng đổi mật khẩu chưa sẵn sàng. Vui lòng thử lại sau.',
    });
  });

  it('falls back to a connection message for a non-HTTP failure', () => {
    expect(changePasswordError(new TypeError('Failed to fetch'))).toEqual({
      field: 'root',
      message: 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
    });
  });

  it('reads `status` when `statusCode` is absent', () => {
    expect(changePasswordError({ status: 401 }).field).toBe('currentPassword');
  });
});
