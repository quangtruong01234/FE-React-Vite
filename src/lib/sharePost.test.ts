import { describe, it, expect, vi, afterEach } from 'vitest';
import { postShareUrl } from './sharePost';

describe('postShareUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds an absolute /post/:id link from the current origin', () => {
    vi.stubGlobal('window', { location: { origin: 'https://trybuy.test' } });
    expect(postShareUrl(42)).toBe('https://trybuy.test/post/42');
  });

  it('falls back to a relative path when window is unavailable', () => {
    vi.stubGlobal('window', undefined);
    expect(postShareUrl(7)).toBe('/post/7');
  });
});
