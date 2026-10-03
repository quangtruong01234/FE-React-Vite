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
    expect(isPrefixOf(queryKeys.social.followingFeedAll, queryKeys.social.feed())).toBe(false);
  });

  it("feedAll is a prefix of the plain and every searched for-you feed", () => {
    // A new post / like / edit must reach a searched feed too, not just `""`.
    expect(isPrefixOf(queryKeys.social.feedAll, queryKeys.social.feed())).toBe(true);
    expect(isPrefixOf(queryKeys.social.feedAll, queryKeys.social.feed('ban phim'))).toBe(true);
    expect(queryKeys.social.feed('a')).not.toEqual(queryKeys.social.feed('b'));
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

// LIST-SEARCH-01: the search term is the last key segment, so a searched page
// is its own cache entry yet still falls under the list's invalidation prefix.
describe("searched list keys", () => {
  const CASES: [string, readonly unknown[], readonly unknown[], readonly unknown[]][] = [
    ["wishlist", queryKeys.products.wishlist, queryKeys.products.wishlistList(1, 20), queryKeys.products.wishlistList(1, 20, "ao")],
    ["product risk", queryKeys.products.adminRisk, queryKeys.products.adminRiskList(0, 1), queryKeys.products.adminRiskList(0, 1, "ao")],
    ["seller orders", queryKeys.orders.seller, queryKeys.orders.sellerList(1, 20, "confirmed"), queryKeys.orders.sellerList(1, 20, "confirmed", "ord_1")],
    ["my returns", queryKeys.orders.returnRequests, queryKeys.orders.returnMine(1, 20), queryKeys.orders.returnMine(1, 20, "rr_1")],
    ["return queue", queryKeys.orders.returnRequests, queryKeys.orders.returnQueue(1, 20), queryKeys.orders.returnQueue(1, 20, undefined, "rr_1")],
    ["admin vouchers", queryKeys.orders.adminVouchers, queryKeys.orders.adminVouchersList(1, 20), queryKeys.orders.adminVouchersList(1, 20, "SALE")],
    ["seller vouchers", queryKeys.orders.sellerVouchers, queryKeys.orders.sellerVouchersList(1, 20), queryKeys.orders.sellerVouchersList(1, 20, "SALE")],
    ["users", queryKeys.users.all, queryKeys.users.list(1, 20), queryKeys.users.list(1, 20, "an")],
    ["reported posts", queryKeys.social.adminReports, queryKeys.social.adminReportsList("pending", 1), queryKeys.social.adminReportsList("pending", 1, "spam")],
    ["posts by user", queryKeys.social.userScopeAll, queryKeys.social.postsByUser("usr_1", 1), queryKeys.social.postsByUser("usr_1", 1, "spam")],
    ["following feed", queryKeys.social.followingFeedAll, queryKeys.social.followingFeed("usr_1"), queryKeys.social.followingFeed("usr_1", "spam")],
  ];

  it.each(CASES)("%s: the term splits the cache but keeps the prefix", (_name, prefix, plain, searched) => {
    expect(searched).not.toEqual(plain);
    expect(isPrefixOf(prefix, plain)).toBe(true);
    expect(isPrefixOf(prefix, searched)).toBe(true);
  });
});
