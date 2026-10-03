import { describe, it, expect } from 'vitest';
import {
  profileFormSchema,
  profileFormSchemaFor,
  isEmailChanged,
  profileUpdatePayload,
  profileUpdateError,
} from './profileForm';

const valid = { name: 'Quang', email: 'quang@example.com' };

describe('profileFormSchema', () => {
  it('accepts a filled-in profile', () => {
    const result = profileFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects a name made only of whitespace', () => {
    // Without `.trim()` this passes `min(1)`, is saved as-is, and every label
    // for the account renders blank afterwards.
    const result = profileFormSchema.safeParse({ ...valid, name: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('nameRequired');
  });

  it('rejects an empty name', () => {
    expect(profileFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('saves the trimmed name, not what was typed', () => {
    const result = profileFormSchema.safeParse({ ...valid, name: '  Quang  ' });
    expect(result.success && result.data.name).toBe('Quang');
  });

  it('still rejects a malformed email', () => {
    const result = profileFormSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('emailInvalid');
  });

  it('treats the avatar as optional', () => {
    expect(profileFormSchema.safeParse({ ...valid, avatar: undefined }).success).toBe(true);
    expect(profileFormSchema.safeParse({ ...valid, avatar: 'https://cdn/x.png' }).success).toBe(true);
  });
});

// EMAIL-REAUTH-01 (2026-09-26): an email change needs the current password.
describe('email change re-auth', () => {
  const stored = 'quang@example.com';

  describe('isEmailChanged', () => {
    it('is false for the stored email re-sent unchanged', () => {
      expect(isEmailChanged(stored, stored)).toBe(false);
    });

    it('counts a case-only edit as a change — the backend compares exact strings', () => {
      expect(isEmailChanged(stored, 'Quang@example.com')).toBe(true);
    });
  });

  describe('profileFormSchemaFor', () => {
    const schema = profileFormSchemaFor(stored);

    it('needs no password when the email is unchanged', () => {
      expect(schema.safeParse({ ...valid, email: stored }).success).toBe(true);
    });

    it('asks for the password on the password field when the email changed', () => {
      const result = schema.safeParse({ ...valid, email: 'new@example.com' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(['currentPassword']);
      expect(result.error?.issues[0]?.message).toBe('passwordForEmail');
    });

    it('treats an empty password as missing — the backend 400s an empty string', () => {
      expect(schema.safeParse({ ...valid, email: 'new@example.com', currentPassword: '' }).success).toBe(false);
    });

    it('accepts a changed email with a password', () => {
      const result = schema.safeParse({ ...valid, email: 'new@example.com', currentPassword: 'secret1' });
      expect(result.success).toBe(true);
    });
  });

  describe('profileUpdatePayload', () => {
    it('sends currentPassword with a changed email', () => {
      const payload = profileUpdatePayload(
        { name: 'Quang', email: 'new@example.com', currentPassword: 'secret1' },
        stored,
      );
      expect(payload).toEqual({ name: 'Quang', email: 'new@example.com', avatar: undefined, currentPassword: 'secret1' });
    });

    it('drops a leftover password once the email is back to the stored one', () => {
      // The old gateway 400s the unknown key (`forbidNonWhitelisted`), and a
      // name-only save has no business carrying a password.
      const payload = profileUpdatePayload({ name: 'Quang', email: stored, currentPassword: 'secret1' }, stored);
      expect('currentPassword' in payload).toBe(false);
    });

    it('omits the key entirely on a plain save', () => {
      const payload = profileUpdatePayload({ name: 'Quang', email: stored, avatar: 'https://cdn/x.png' }, stored);
      expect(payload).toEqual({ name: 'Quang', email: stored, avatar: 'https://cdn/x.png' });
      expect('currentPassword' in payload).toBe(false);
    });
  });

  describe('profileUpdateError', () => {
    it('puts a wrong password on the password field', () => {
      expect(
        profileUpdateError({ statusCode: 401, status: 401, message: 'Unauthorized', errorCode: 'INVALID_CURRENT_PASSWORD' }),
      ).toEqual({ field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng.' });
    });

    it('reports a dead session on the form, not the password field', () => {
      expect(
        profileUpdateError({ statusCode: 401, status: 401, message: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }),
      ).toEqual({ field: 'root', message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
    });

    it('maps the missing-password 400 onto the password field', () => {
      expect(
        profileUpdateError({ statusCode: 400, status: 400, message: 'currentPassword is required to change the email' }),
      ).toEqual({ field: 'currentPassword', message: 'Nhập mật khẩu hiện tại để đổi email' });
    });

    it('explains the 10-per-minute rate limit', () => {
      expect(profileUpdateError({ statusCode: 429, status: 429, message: 'ThrottlerException: Too Many Requests' })).toEqual({
        field: 'root',
        message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
      });
    });

    it('keeps the email-taken 409 on the email field', () => {
      expect(profileUpdateError({ statusCode: 409, status: 409, message: 'Email is already registered' })).toEqual({
        field: 'email',
        message: 'Email này đã được đăng ký. Hãy dùng email khác hoặc đăng nhập.',
      });
    });

    it('falls back to the generic message on a network failure', () => {
      expect(profileUpdateError(new TypeError('Failed to fetch'))).toEqual({
        field: 'root',
        message: 'Cập nhật thất bại',
      });
    });
  });
});

describe('profileUpdateError — English (I18N-02)', () => {
  it('translates its own copy and the conflict mapping', () => {
    expect(profileUpdateError({ statusCode: 429, status: 429, message: 'Too Many' }, 'en').message).toMatch(
      /too fast/,
    );
    expect(
      profileUpdateError({ statusCode: 409, status: 409, message: 'Email is already registered' }, 'en'),
    ).toEqual({ field: 'email', message: 'This email is already registered. Use another email or sign in.' });
    expect(profileUpdateError(new TypeError('Failed to fetch'), 'en').message).toBe('Update failed');
  });
});
