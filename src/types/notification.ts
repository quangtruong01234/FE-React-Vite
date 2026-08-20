import type { UserSummary } from "./user";

// --- Notification ---

export interface Notification {
  id: string;
  userId: string;
  type: string;
  /** Order id for order-type notifications; bigint column → backend may serialize as string ("107"). */
  orderId: string | null;
  /** Post to deep-link to — set only for type "comment" | "reply". */
  postId: string | null;
  /** userId of the commenter/replier — set only for type "comment" | "reply". */
  actorId: string | null;
  /**
   * `actorId` hydrated to a display summary (OVERFETCH-01 §7) — null when
   * `actorId` is null, absent on responses served before the backend rollout.
   */
  actor?: UserSummary | null;
  /** Comment/reply text (≤255 chars) — set only for type "comment" | "reply". */
  preview: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
