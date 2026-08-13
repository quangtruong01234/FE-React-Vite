import { describe, expect, it } from "vitest";
import { queryKeys } from "./queryKeys";

// QK-01 regression guard: the list-level social keys used for invalidation in
// useFeed (post edit/delete) must stay valid prefixes of the item-level keys
// they are meant to match. TanStack Query's invalidateQueries matches by prefix,
// so if a factory shape changes without the list-level key following, the
// invalidation silently stops matching (stale feed / profile posts).
function isPrefixOf(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  if (prefix.length > key.length) return false;
  return prefix.every((segment, i) => segment === key[i]);
}

describe("queryKeys.social list-level invalidation prefixes", () => {
  it("followingFeedAll is a prefix of every followingFeed query key", () => {
    expect(isPrefixOf(queryKeys.social.followingFeedAll, queryKeys.social.followingFeed('usr_1'))).toBe(
      true,
    );
    expect(isPrefixOf(queryKeys.social.followingFeedAll, queryKeys.social.followingFeed('usr_999'))).toBe(
      true,
    );
  });

  it("userScopeAll is a prefix of the user-scoped social query keys", () => {
    expect(isPrefixOf(queryKeys.social.userScopeAll, queryKeys.social.postsByUser('usr_1', 1))).toBe(true);
    expect(isPrefixOf(queryKeys.social.userScopeAll, queryKeys.social.postsByUser('usr_7', 3))).toBe(true);
    expect(isPrefixOf(queryKeys.social.userScopeAll, queryKeys.social.followers('usr_1'))).toBe(true);
    expect(isPrefixOf(queryKeys.social.userScopeAll, queryKeys.social.following('usr_1'))).toBe(true);
  });

  it("post is a prefix of its comments key", () => {
    // invalidateCommentViews relies on this: invalidating the post key must also
    // sweep that post's comment list, so one call refreshes header + list.
    expect(isPrefixOf(queryKeys.social.post('post_1'), queryKeys.social.comments('post_1'))).toBe(true);
    expect(isPrefixOf(queryKeys.social.post('post_1'), queryKeys.social.comments('post_2'))).toBe(false);
  });

  it("followingFeedAll does not accidentally match the for-you feed", () => {
    expect(isPrefixOf(queryKeys.social.followingFeedAll, queryKeys.social.feed(1))).toBe(false);
  });
});

describe("queryKeys.reviews paged keys", () => {
  // Regression guard for the reviews pagination bug: the query key must vary
  // with `page` (or a page change never refetches), while `byProduct` stays a
  // valid invalidation prefix for every page of that product.
  it("byProductPage varies with page", () => {
    expect(queryKeys.reviews.byProductPage('prod_5', 1)).not.toEqual(queryKeys.reviews.byProductPage('prod_5', 2));
  });

  it("byProduct is a prefix of every byProductPage key", () => {
    expect(isPrefixOf(queryKeys.reviews.byProduct('prod_5'), queryKeys.reviews.byProductPage('prod_5', 1))).toBe(true);
    expect(isPrefixOf(queryKeys.reviews.byProduct('prod_5'), queryKeys.reviews.byProductPage('prod_5', 42))).toBe(true);
    expect(isPrefixOf(queryKeys.reviews.byProduct('prod_6'), queryKeys.reviews.byProductPage('prod_5', 1))).toBe(false);
  });
});
