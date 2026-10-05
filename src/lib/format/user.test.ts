import { describe, it, expect } from 'vitest';
import {
  USER_FALLBACK,
  deletedUserLabel,
  isDeletedUser,
  userDisplayName,
  userFallback,
  nonBlank,
  userSummaryLabel,
} from './user';

describe('nonBlank', () => {
  it('trims and keeps a string with visible content', () => {
    expect(nonBlank('  Nguyễn Văn A  ')).toBe('Nguyễn Văn A');
  });

  it('treats empty, whitespace-only, null and undefined alike', () => {
    expect(nonBlank('')).toBeNull();
    expect(nonBlank('   ')).toBeNull();
    expect(nonBlank(null)).toBeNull();
    expect(nonBlank(undefined)).toBeNull();
  });
});

describe('userDisplayName', () => {
  it('prefers the display name the account set (AUTHOR-NAME-01)', () => {
    expect(userDisplayName({ username: 'canceltest1779978329', name: 'API Test User' })).toBe(
      'API Test User',
    );
  });

  it('falls back to the username when `name` is null — most accounts never set one', () => {
    expect(userDisplayName({ username: 'shop1', name: null })).toBe('shop1');
  });

  it('falls back to the username when the key is absent (pre-rollout gateway)', () => {
    expect(userDisplayName({ username: 'shop1' })).toBe('shop1');
  });

  it('does not render a blank label for a whitespace-only name', () => {
    // `PATCH /user/:id` accepts `name: "   "`, and a bare `name ?? username`
    // would print nothing at all for that account.
    expect(userDisplayName({ username: 'shop1', name: '   ' })).toBe('shop1');
  });

  it('trims the display name it renders', () => {
    expect(userDisplayName({ username: 'shop1', name: ' Quang  ' })).toBe('Quang');
  });

  it('carries no id when nothing identifies the person', () => {
    for (const author of [null, undefined, { username: '', name: '' }]) {
      expect(userDisplayName(author)).toBe(USER_FALLBACK);
    }
    expect(USER_FALLBACK).not.toMatch(/usr_/);
  });

  it('uses the caller fallback when the whole embed is missing', () => {
    // The chat list keeps two unresolved rows apart by id; the thread header
    // passes '' so it can swap in the conversation number instead.
    expect(userDisplayName(undefined, 'Người dùng #usr_09')).toBe('Người dùng #usr_09');
    expect(userDisplayName(null, '')).toBe('');
  });

  it('never reaches the caller fallback while a username is present', () => {
    expect(userDisplayName({ username: 'shop1', name: '  ' }, 'Người dùng #usr_09')).toBe('shop1');
  });
});

describe('userSummaryLabel', () => {
  it('prefers the hydrated username', () => {
    const label = userSummaryLabel(
      { id: 'usr_0000000000000009', username: 'quang', avatar: null },
      'usr_0000000000000009',
    );
    expect(label).toBe('@quang');
  });

  it('falls back to the bare id when the embed is missing (pre-rollout response)', () => {
    expect(userSummaryLabel(undefined, 'usr_0000000000000009')).toBe('#usr_0000000000000009');
  });

  it('falls back to the bare id when the embed is null', () => {
    expect(userSummaryLabel(null, 'usr_0000000000000009')).toBe('#usr_0000000000000009');
  });

  it('falls back to the bare id when the hydrated row has no username', () => {
    const label = userSummaryLabel(
      { id: 'usr_0000000000000009', username: '', avatar: null },
      'usr_0000000000000009',
    );
    expect(label).toBe('#usr_0000000000000009');
  });

  it('returns null when there is neither an embed nor an id', () => {
    expect(userSummaryLabel(null, null)).toBeNull();
  });
});

describe('userFallback (I18N-07)', () => {
  it('names a nameless person in the UI language', () => {
    expect(userFallback('vi')).toBe(USER_FALLBACK);
    expect(userFallback('en')).toBe('User');
    expect(userDisplayName(null, userFallback('en'))).toBe('User');
  });
});

describe('deleted accounts (ACCOUNT-DELETE-01)', () => {
  const deleted = { name: null, username: 'deleted_usr_NumXIjeHvZjS2CKK' };

  it('recognises the anonymised username prefix, in any case', () => {
    expect(isDeletedUser(deleted)).toBe(true);
    expect(isDeletedUser({ username: 'DELETED_usr_x' })).toBe(true);
  });

  it('does not flag a live account, a missing embed, or the word mid-name', () => {
    expect(isDeletedUser({ username: 'bob' })).toBe(false);
    expect(isDeletedUser({ username: 'not_deleted_' })).toBe(false);
    expect(isDeletedUser({ username: null })).toBe(false);
    expect(isDeletedUser(null)).toBe(false);
    expect(isDeletedUser(undefined)).toBe(false);
  });

  it('labels a deleted account "Deleted user" in the given language, never its username', () => {
    expect(userDisplayName(deleted)).toBe('Người dùng đã xóa');
    expect(userDisplayName(deleted, userFallback('en'), 'en')).toBe('Deleted user');
    expect(deletedUserLabel('en')).toBe('Deleted user');
  });

  it('ignores a leftover display name on a deleted account', () => {
    expect(userDisplayName({ name: 'Bob', username: 'deleted_usr_1' }, '', 'en')).toBe('Deleted user');
  });
});
