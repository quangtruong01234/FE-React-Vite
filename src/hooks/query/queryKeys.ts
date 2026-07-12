import type { ProductParams, AnalyticsQueryParams } from "@/types";

export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (params: ProductParams) => ["products", "list", params] as const,
    detail: (id: number) => ["products", id] as const,
    withInventory: (id: number) => ["products", id, "inventory"] as const,
    cartItems: (ids: number[]) => ["products", "cart-items", ids] as const,
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
    byUser: (userId: number) => ["orders", "user", userId] as const,
    statusCounts: (userId: number) =>
      ["orders", "user", userId, "status-counts"] as const,
    detail: (id: number) => ["orders", id] as const,
    admin: ["orders", "admin"] as const,
    seller: ["orders", "seller"] as const,
    sellerList: (page: number, limit: number, status?: string) =>
      ["orders", "seller", page, limit, status] as const,
    sellerDetail: (id: number) => ["orders", "seller", "detail", id] as const,
    returnRequests: ["orders", "return-requests"] as const,
    returnMine: (page: number, limit: number) =>
      ["orders", "return-requests", "mine", page, limit] as const,
    returnQueue: (page: number, limit: number, status?: string) =>
      ["orders", "return-requests", "queue", page, limit, status] as const,
    sellerAnalytics: (params: AnalyticsQueryParams) =>
      ["orders", "seller", "analytics", params] as const,
    adminAnalytics: (params: AnalyticsQueryParams) =>
      ["orders", "admin", "analytics", params] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (page: number, limit: number) =>
      ["users", "list", page, limit] as const,
    detail: (id: number) => ["users", id] as const,
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
  },
  social: {
    feed: (page: number) => ["social", "feed", page] as const,
    // List-level prefix for invalidating every following-feed query at once.
    followingFeedAll: ["social", "following-feed"] as const,
    followingFeed: (userId: number) =>
      ["social", "following-feed", userId] as const,
    // List-level prefix covering the user-scoped social surfaces (profile posts,
    // followers, following). Used to invalidate a user's post lists on
    // post edit/delete without inlining the raw key array.
    userScopeAll: ["social", "user"] as const,
    postsByUser: (userId: number, page = 1) =>
      ["social", "user", userId, "posts", page] as const,
    post: (id: number) => ["social", "posts", id] as const,
    comments: (postId: number) =>
      ["social", "posts", postId, "comments"] as const,
    replies: (commentId: number) =>
      ["social", "comments", commentId, "replies"] as const,
    followers: (userId: number) =>
      ["social", "user", userId, "followers"] as const,
    following: (userId: number) =>
      ["social", "user", userId, "following"] as const,
    isFollowing: (viewerId: number, targetId: number) =>
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
    byConversation: (conversationId: number) =>
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
    byProduct: (productId: number) =>
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
    byProduct: (productId: number) =>
      ["reviews", "product", productId] as const,
    byProductPage: (productId: number, page: number) =>
      ["reviews", "product", productId, "page", page] as const,
  },
};
