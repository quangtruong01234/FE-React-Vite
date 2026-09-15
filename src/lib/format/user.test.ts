import { describe, it, expect } from 'vitest';
import { USER_FALLBACK, userDisplayName, nonBlank, userSummaryLabel } from './user';

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
