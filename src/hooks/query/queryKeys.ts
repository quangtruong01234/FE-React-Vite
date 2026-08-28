import type {
  ProductParams,
  AnalyticsQueryParams,
  PriceSuggestionParams,
} from "@/types";

export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (params: ProductParams) => ["products", "list", params] as const,
    detail: (id: string) => ["products", id] as const,
    withInventory: (id: string) => ["products", id, "inventory"] as const,
    cartItems: (ids: string[]) => ["products", "cart-items", ids] as const,
    bySku: (sku: string) => ["products", "sku", sku] as const,
    byCategory: (categoryId: number) =>
      ["products", "category", categoryId] as const,
    byBrand: (brandId: number) => ["products", "brand", brandId] as const,
    shopStats: ["products", "shop-stats"] as const,
    // Wishlist (F6): list-level prefix invalidates both the page view and the
    // membership id-set in one call.
    wishlist: ["products", "wishlist"] as const,
    wishlistList: (page: number, limit: number) =>
      ["products", "wishlist", "list", page, limit] as const,
    wishlistIds: ["products", "wishlist", "ids"] as const,
    // Catalog price suggestion (AI-01): advisory stats for the seller form.
    priceSuggestion: (params: PriceSuggestionParams) =>
      ["products", "price-suggestion", params] as const,
    // Admin risk queue (AI-02): list-level prefix invalidates every
    // minScore/page combination after a rescore.
    adminRisk: ["products", "admin-risk"] as const,
    adminRiskList: (minScore: number, page: number) =>
      ["products", "admin-risk", minScore, page] as const,
  },
  brands: {
    all: ["brands"] as const,
    detail: (id: number) => ["brands", id] as const,
    pending: ["brands", "pending"] as const,
  },
  categories: {
    all: ["categories"] as const,
    detail: (id: number) => ["categories", id] as const,
    pending: ["categories", "pending"] as const,
  },
  orders: {
    all: ["orders"] as const,
    byUser: (userId: string) => ["orders", "user", userId] as const,
    // One cache entry per filter tab, since the server now returns the filtered
    // page. Stays under the `byUser` prefix so `invalidateOrderViews` refreshes
    // every tab (and the badge counts) with the one invalidation it already does.
    // `q` is the server-side order-code search — part of the key so each search
    // term caches (and paginates) separately from the unfiltered tab.
    byUserList: (userId: string, statuses: readonly string[], q = "") =>
      ["orders", "user", userId, "list", statuses.join(","), q.trim()] as const,
    statusCounts: (userId: string) =>
      ["orders", "user", userId, "status-counts"] as const,
    detail: (id: string) => ["orders", id] as const,
    admin: ["orders", "admin"] as const,
    seller: ["orders", "seller"] as const,
    sellerList: (page: number, limit: number, status?: string) =>
      ["orders", "seller", page, limit, status] as const,
    sellerDetail: (id: string) => ["orders", "seller", "detail", id] as const,
    returnRequests: ["orders", "return-requests"] as const,
    returnMine: (page: number, limit: number) =>
      ["orders", "return-requests", "mine", page, limit] as const,
    returnQueue: (page: number, limit: number, status?: string) =>
      ["orders", "return-requests", "queue", page, limit, status] as const,
    sellerAnalytics: (params: AnalyticsQueryParams) =>
      ["orders", "seller", "analytics", params] as const,
    adminAnalytics: (params: AnalyticsQueryParams) =>
      ["orders", "admin", "analytics", params] as const,
    // Admin voucher console (F3-ADMIN): list-level prefix invalidates every page
    // after a create/deactivate, since both reorder or restatus the list.
    adminVouchers: ["orders", "admin", "vouchers"] as const,
    adminVouchersList: (page: number, limit: number) =>
      ["orders", "admin", "vouchers", page, limit] as const,
    // F3: vouchers priced against one exact basket. The signature keys the
    // cache — a different basket is a different answer, so quantities and SKU
    // choices must be part of the key or a stale discount would be shown.
    availableVouchers: (basketSignature: string) =>
      ["orders", "vouchers", "available", basketSignature] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (page: number, limit: number) =>
      ["users", "list", page, limit] as const,
    detail: (id: string) => ["users", id] as const,
    featuredSellers: (limit: number) =>
      ["users", "featured-sellers", limit] as const,
    // Per-user address book (structured GHN checkout).
    addresses: ["users", "addresses"] as const,
  },
  shipping: {
    provinces: ["shipping", "provinces"] as const,
    districts: (provinceId: number) =>
      ["shipping", "districts", provinceId] as const,
    wards: (districtId: number) => ["shipping", "wards", districtId] as const,
    // List-level prefix. GHN-WARD-01: GHN retires wards, and a list cached
    // before that happened still offers one — refetch every district's list
    // once GHN has refused an address, so the re-pick sees the current one.
    wardsAll: ["shipping", "wards"] as const,
  },
  social: {
    feed: (page: number) => ["social", "feed", page] as const,
    // List-level prefix for invalidating every following-feed query at once.
    followingFeedAll: ["social", "following-feed"] as const,
    followingFeed: (userId: string) =>
      ["social", "following-feed", userId] as const,
    // List-level prefix covering the user-scoped social surfaces (profile posts,
    // followers, following). Used to invalidate a user's post lists on
    // post edit/delete without inlining the raw key array.
    userScopeAll: ["social", "user"] as const,
    postsByUser: (userId: string, page = 1) =>
      ["social", "user", userId, "posts", page] as const,
    post: (id: string) => ["social", "posts", id] as const,
    comments: (postId: string) =>
      ["social", "posts", postId, "comments"] as const,
    replies: (commentId: string) =>
      ["social", "comments", commentId, "replies"] as const,
    followers: (userId: string) =>
      ["social", "user", userId, "followers"] as const,
    following: (userId: string) =>
      ["social", "user", userId, "following"] as const,
    isFollowing: (viewerId: string, targetId: string) =>
      ["social", "is-following", viewerId, targetId] as const,
    adminReports: ["social", "admin-reports"] as const,
    adminReportsList: (status: string, page: number) =>
      ["social", "admin-reports", status, page] as const,
  },
  notifications: {
    list: (page: number) => ["notifications", "list", page] as const,
    unreadCount: ["notifications", "unread"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
  },
  messages: {
    byConversation: (conversationId: string) =>
      ["messages", "conversation", conversationId] as const,
  },
  payment: {
    options: ["payment", "options"] as const,
    result: (params: Record<string, string>) =>
      ["payment", "result", params] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    lowStock: ["inventory", "low-stock"] as const,
    byProduct: (productId: string) =>
      ["inventory", "product", productId] as const,
    bySku: (sku: string) => ["inventory", "sku", sku] as const,
    detail: (id: number) => ["inventory", id] as const,
  },
  cart: {
    all: ["cart"] as const,
  },
  misc: {
    health: ["misc", "health"] as const,
  },
  reviews: {
    byProduct: (productId: string) =>
      ["reviews", "product", productId] as const,
    byProductPage: (productId: string, page: number) =>
      ["reviews", "product", productId, "page", page] as const,
  },
};
