// --- Notification ---

export interface Notification {
  id: number;
  userId: number;
  type: string;
  orderId: number | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
