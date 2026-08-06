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
  /** Comment/reply text (≤255 chars) — set only for type "comment" | "reply". */
  preview: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
