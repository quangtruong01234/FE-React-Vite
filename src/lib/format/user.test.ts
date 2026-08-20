import { describe, it, expect } from 'vitest';
import { userSummaryLabel } from './user';

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
