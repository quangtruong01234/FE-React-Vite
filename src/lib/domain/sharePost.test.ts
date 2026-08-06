import { describe, it, expect, vi, afterEach } from 'vitest';
import { postShareUrl } from './sharePost';

describe('postShareUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds an absolute /post/:id link from the current origin', () => {
    vi.stubGlobal('window', { location: { origin: 'https://trybuy.test' } });
    expect(postShareUrl('post_0000000000000042')).toBe('https://trybuy.test/post/post_0000000000000042');
  });

  it('falls back to a relative path when window is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(postShareUrl('post_0000000000000007')).toBe('/post/post_0000000000000007');
  });
});
