// --- Notification ---

export interface Notification {
  id: number;
  userId: number;
  type: string;
  /** Order id for order-type notifications; bigint column → backend may serialize as string ("107"). */
  orderId: number | string | null;
  /** Post to deep-link to — set only for type "comment" | "reply". */
  postId: number | null;
  /** userId of the commenter/replier — set only for type "comment" | "reply". */
  actorId: number | null;
  /** Comment/reply text (≤255 chars) — set only for type "comment" | "reply". */
  preview: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
