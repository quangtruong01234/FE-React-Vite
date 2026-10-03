import type { UserSummary } from "./user";

// --- Notification ---

export interface Notification {
  id: string;
  userId: string;
  type: string;
  /** Order id for order-type notifications; bigint column → backend may serialize as string ("107"). */
  orderId: string | null;
  /** Post to deep-link to — set only for type "comment" | "reply" | "like". */
  postId: string | null;
  /** userId of the commenter/replier/latest liker — set only for type "comment" | "reply" | "like". */
  actorId: string | null;
  /**
   * `actorId` hydrated to a display summary (OVERFETCH-01 §7) — null when
   * `actorId` is null, absent on responses served before the backend rollout.
   */
  actor?: UserSummary | null;
  /**
   * Product to deep-link to — set only for "wishlist_back_in_stock" | "wishlist_price_drop"
   * (WISHLIST-ALERT-01); null on every other type, absent on responses before that rollout.
   */
  productId?: string | null;
  /**
   * Comment/reply text (≤255 chars) for "comment" | "reply"; the product name (≤120 chars)
   * for the two wishlist types.
   */
  preview: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
