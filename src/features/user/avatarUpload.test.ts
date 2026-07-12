import { describe, it, expect } from 'vitest';
import { replacePendingAvatar, discardedAvatarOrphan } from './avatarUpload';

const a = { url: 'https://res.cloudinary.com/x/avatars/1_aaa.png', publicId: 'avatars/1_aaa' };
const b = { url: 'https://res.cloudinary.com/x/avatars/1_bbb.png', publicId: 'avatars/1_bbb' };

describe('replacePendingAvatar', () => {
  it('first upload of the session has no orphan', () => {
    expect(replacePendingAvatar(null, a)).toEqual({ next: a, orphan: null });
  });

  it('replacing a not-yet-saved avatar orphans the previous upload (UP-02b)', () => {
    expect(replacePendingAvatar(a, b)).toEqual({ next: b, orphan: a.publicId });
  });
});

describe('discardedAvatarOrphan', () => {
  it('returns the pending upload to delete on cancel/close (UP-02a)', () => {
    expect(discardedAvatarOrphan(a)).toBe(a.publicId);
  });

  it('returns null when nothing was uploaded this session', () => {
    expect(discardedAvatarOrphan(null)).toBeNull();
  });
});
