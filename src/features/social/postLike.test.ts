import { describe, it, expect } from 'vitest';
import { shownLikeCount } from './postLike';

// The post page used to start every post as "not liked", so a post the viewer
// had already liked showed an empty heart and its count went up again on click.
describe('shownLikeCount', () => {
  it('shows the server count while the toggle agrees with it', () => {
    expect(shownLikeCount(5, true, true)).toBe(5);
    expect(shownLikeCount(5, false, false)).toBe(5);
  });

  it('adds one when the viewer likes a post the server has as not liked', () => {
    expect(shownLikeCount(5, false, true)).toBe(6);
  });

  it('takes one away when the viewer unlikes a post the server has as liked', () => {
    expect(shownLikeCount(5, true, false)).toBe(4);
  });

  it('never goes below zero', () => {
    expect(shownLikeCount(0, true, false)).toBe(0);
  });
});
