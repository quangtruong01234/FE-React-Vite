import { describe, expect, it } from 'vitest';
import type { Post } from '@/types';
import { findFeedLikeCount, patchFeedPost, removeFeedPost } from './feedCache';
import type { FeedCache } from './feedCache';

function post(id: string, likeCount: number): Post {
  return { id, likeCount, isLiked: false } as Post;
}

function feed(...pages: Post[][]): FeedCache {
  return {
    pages: pages.map((data, i) => ({ data, total: 0, page: i + 1, limit: 10, totalPages: pages.length, hasNext: false })),
    pageParams: pages.map((_, i) => i + 1),
  };
}

describe('patchFeedPost', () => {
  it('patches the matching post on whichever page holds it', () => {
    const next = patchFeedPost(feed([post('post_1', 1)], [post('post_2', 5)]), 'post_2', { isLiked: true, likeCount: 6 });
    expect(next?.pages[1].data[0]).toMatchObject({ id: 'post_2', isLiked: true, likeCount: 6 });
    expect(next?.pages[0].data[0]).toMatchObject({ id: 'post_1', likeCount: 1 });
  });

  it('leaves an unloaded cache alone', () => {
    expect(patchFeedPost(undefined, 'post_1', { likeCount: 1 })).toBeUndefined();
  });
});

describe('removeFeedPost', () => {
  it('drops the post from every page', () => {
    const next = removeFeedPost(feed([post('post_1', 0), post('post_2', 0)]), 'post_1');
    expect(next?.pages[0].data.map((p) => p.id)).toEqual(['post_2']);
  });
});

describe('findFeedLikeCount', () => {
  it('reads the count from a searched feed when the plain feed never loaded the post', () => {
    const plain = feed([post('post_1', 2)]);
    const searched = feed([post('post_9', 7)]);
    expect(findFeedLikeCount([plain, undefined, searched], 'post_9')).toBe(7);
  });

  it('falls back to 0 when no cache holds the post', () => {
    expect(findFeedLikeCount([undefined, feed([])], 'post_1')).toBe(0);
  });
});
