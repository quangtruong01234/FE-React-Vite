import { describe, it, expect } from 'vitest';
import { commentAuthorView, COMMENT_AUTHOR_FALLBACK } from './commentAuthor';
import type { PostAuthor } from '@/types';

const author = (over: Partial<PostAuthor> = {}): PostAuthor => ({
  id: 'usr_5W9c1VIy1h8L6pEV',
  username: 'test1',
  avatar: null,
  ...over,
});

describe('commentAuthorView', () => {
  it('prefers the display name over the username', () => {
    expect(commentAuthorView(author({ name: 'Nguyễn Văn A' })).displayName).toBe('Nguyễn Văn A');
  });

  it('falls back to the username when there is no display name', () => {
    expect(commentAuthorView(author()).displayName).toBe('test1');
  });

  it('never renders the raw user id when the author is missing', () => {
    for (const missing of [null, undefined]) {
      const view = commentAuthorView(missing);
      expect(view.displayName).toBe(COMMENT_AUTHOR_FALLBACK);
      expect(view.displayName).not.toContain('usr_');
      expect(view.avatarSrc).toBeUndefined();
    }
  });

  it('treats a blank name or username as absent', () => {
    expect(commentAuthorView(author({ name: '   ' })).displayName).toBe('test1');
    expect(commentAuthorView(author({ name: '', username: '  ' })).displayName).toBe(
      COMMENT_AUTHOR_FALLBACK,
    );
  });

  it('passes the avatar through and drops a null/blank one', () => {
    expect(commentAuthorView(author({ avatar: 'trybuy/avatars/23.png' })).avatarSrc).toBe(
      'trybuy/avatars/23.png',
    );
    expect(commentAuthorView(author({ avatar: null })).avatarSrc).toBeUndefined();
    expect(commentAuthorView(author({ avatar: '  ' })).avatarSrc).toBeUndefined();
  });

  it('trims the value it renders', () => {
    expect(commentAuthorView(author({ username: '  test1  ' })).displayName).toBe('test1');
  });
});
