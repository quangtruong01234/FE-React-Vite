import { describe, expect, it } from 'vitest';
import { sellerFollowState, sellerProfilePath } from './sellerCard';

describe('sellerProfilePath', () => {
  it('links to the seller profile by public id', () => {
    expect(sellerProfilePath({ userId: 'usr_60cc', user: { id: 'usr_60cc', name: 'techstore' } })).toBe(
      '/profile/usr_60cc',
    );
  });

  // ENRICH-FAIL-01: no `user` means the seller is gone — a link would 404.
  it('does not link a seller who no longer exists', () => {
    expect(sellerProfilePath({ userId: 'usr_60cc' })).toBeNull();
  });
});

describe('sellerFollowState', () => {
  const base = { viewerId: 'usr_me', sellerId: 'usr_shop', sellerExists: true, isFollowing: false, isLoading: false };

  it('offers follow to a signed-in buyer who does not follow yet', () => {
    expect(sellerFollowState(base)).toBe('follow');
  });

  it('shows the followed state once the buyer follows the seller', () => {
    expect(sellerFollowState({ ...base, isFollowing: true })).toBe('following');
  });

  it('holds the button while the following list is still loading', () => {
    expect(sellerFollowState({ ...base, isLoading: true })).toBe('loading');
  });

  // Same contract as the "Chat" button beside it: visible, and it asks to sign in.
  it('sends a signed-out visitor to login instead of hiding the button', () => {
    expect(sellerFollowState({ ...base, viewerId: '' })).toBe('login');
  });

  it('is hidden when the seller is gone or is the viewer', () => {
    expect(sellerFollowState({ ...base, sellerExists: false })).toBe('hidden');
    expect(sellerFollowState({ ...base, viewerId: 'usr_shop' })).toBe('hidden');
  });
});
