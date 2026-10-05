import { describe, it, expect } from 'vitest';
import { translate, type MessageKey } from '@/lib/i18n/messages';
import { deleteAccountError, deleteAccountSchema } from './deleteAccount';
import { userMessages } from './user.i18n';

const vi = (key: MessageKey<typeof userMessages>): string =>
  translate(userMessages, 'vi', key);

describe('deleteAccountSchema (ACCOUNT-DELETE-01)', () => {
  it('requires the current password', () => {
    const result = deleteAccountSchema.safeParse({ currentPassword: '' });
    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe('currentPasswordRequired');
  });

  it('sends exactly the one field the endpoint accepts', () => {
    const result = deleteAccountSchema.safeParse({ currentPassword: 'secret', extra: 1 });
    expect(result.success && result.data).toEqual({ currentPassword: 'secret' });
  });
});

describe('deleteAccountError (ACCOUNT-DELETE-01)', () => {
  it('puts a wrong-password 401 on the password field', () => {
    expect(
      deleteAccountError({ statusCode: 401, errorCode: 'INVALID_CURRENT_PASSWORD', message: 'Unauthorized' }),
    ).toEqual({ field: 'currentPassword', message: vi('currentPasswordWrong') });
  });

  it('a dead session (UNAUTHENTICATED) goes to the form banner', () => {
    expect(deleteAccountError({ statusCode: 401, errorCode: 'UNAUTHENTICATED' })).toEqual({
      field: 'root',
      message: vi('sessionExpired'),
    });
  });

  it('403 means an admin account, not a wrong password', () => {
    expect(deleteAccountError({ statusCode: 403 })).toEqual({ field: 'root', message: vi('deleteAccountAdmin') });
  });

  it('maps throttling, already-deleted and a missing route', () => {
    expect(deleteAccountError({ statusCode: 429 }).message).toBe(vi('tooManyTries'));
    expect(deleteAccountError({ statusCode: 400 }).message).toBe(vi('deleteAccountRejected'));
    expect(deleteAccountError({ statusCode: 404 }).message).toBe(vi('notAvailable'));
  });

  it('says a failed backend leg is safe to retry', () => {
    for (const status of [408, 502, 503]) {
      expect(deleteAccountError({ status })).toEqual({ field: 'root', message: vi('deleteAccountRetry') });
    }
  });

  it('falls back to the connection message, in the requested language', () => {
    expect(deleteAccountError(new TypeError('Failed to fetch'), 'en')).toEqual({
      field: 'root',
      message: translate(userMessages, 'en', 'connectionError'),
    });
  });
});
