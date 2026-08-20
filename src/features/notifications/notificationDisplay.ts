import type { LucideIcon } from 'lucide-react';
import {
  BadgeCheck, Ban, Bell, CheckCircle, ClipboardCheck, FolderTree, MessageCircle,
  Package, PackageCheck, Reply, RotateCcw, ShoppingBag, Tag, Truck, XCircle,
} from 'lucide-react';
import { userSummaryLabel } from '@/lib/format/user';
import type { Notification } from '@/types';

export interface NotificationMeta {
  Icon: LucideIcon;
  color: string;
}

export interface NotificationContent {
  title: string;
  body: string;
}

interface TypeConfig extends NotificationMeta {
  title: string;
  /** Returns null when required data is missing → falls back to the raw backend message. */
  body: (n: Notification) => string | null;
}

const DEFAULT_META: NotificationMeta = { Icon: Bell, color: 'text-ink-sec bg-canvas-elevated' };

/** Backend messages quote the entity name in single quotes: "Your brand 'Nike' was rejected." */
function extractQuotedName(message: string): string | null {
  const match = /'([^']+)'/.exec(message);
  return match ? match[1] : null;
}

/** Rejection messages append "Reason: <note>" — recover the note for display. */
function extractReason(message: string): string | null {
  const match = /Reason:\s*(.+)$/.exec(message);
  return match ? match[1].trim() : null;
}

function reviewBody(n: Notification, subject: string, approved: boolean): string {
  const name = extractQuotedName(n.message);
  const label = name ? `${subject} '${name}'` : `${subject} bạn đề xuất`;
  if (approved) return `${label} đã được duyệt.`;
  const reason = extractReason(n.message);
  return reason ? `${label} đã bị từ chối. Lý do: ${reason}` : `${label} đã bị từ chối.`;
}

function orderBody(n: Notification, text: (orderId: string) => string): string | null {
  return n.orderId != null ? text(n.orderId) : null;
}

/**
 * Comment/reply: name the actor and quote the comment text when the backend
 * sent them. The `actor` embed (OVERFETCH-01) is absent on legacy rows and on
 * responses served before the backend rollout, so "Có người" stays the fallback
 * — never the raw `actorId`, which means nothing to a reader.
 */
function socialBody(n: Notification, action: string): string {
  const who = userSummaryLabel(n.actor, null) ?? 'Có người';
  const base = `${who} vừa ${action}`;
  return n.preview ? `${base}: “${n.preview}”` : `${base}.`;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  order_created: {
    Icon: ShoppingBag, color: 'text-accent-amber bg-tb-amber/10',
    title: 'Đặt hàng thành công',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã được đặt thành công.`),
  },
  payment_completed: {
    Icon: CheckCircle, color: 'text-accent-green bg-accent-green/10',
    title: 'Thanh toán thành công',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã được thanh toán thành công.`),
  },
  order_placed: {
    Icon: ShoppingBag, color: 'text-accent-amber bg-accent-amber/10',
    title: 'Đặt hàng thành công',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã được tạo thành công.`),
  },
  // NOTIF-LIFECYCLE-01: the buyer now gets a notification at every step of the
  // lifecycle, and the seller one for each new order.
  new_order: {
    Icon: ClipboardCheck, color: 'text-accent-amber bg-accent-amber/10',
    title: 'Đơn hàng mới',
    body: (n) => orderBody(n, (id) => `Bạn có đơn hàng mới #${id} cần xác nhận.`),
  },
  order_confirmed: {
    Icon: BadgeCheck, color: 'text-accent-amber bg-accent-amber/10',
    title: 'Đơn hàng đã xác nhận',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã được người bán xác nhận.`),
  },
  order_processing: {
    Icon: Package, color: 'text-accent-cyan bg-accent-cyan/10',
    title: 'Đang chuẩn bị hàng',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đang được chuẩn bị để giao.`),
  },
  order_shipped: {
    Icon: Truck, color: 'text-accent-violet bg-accent-violet/10',
    title: 'Đơn hàng đang giao',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã được bàn giao cho đơn vị vận chuyển.`),
  },
  order_delivering: {
    Icon: Truck, color: 'text-accent-violet bg-accent-violet/10',
    title: 'Đang giao đến bạn',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đang trên đường giao đến bạn.`),
  },
  order_completed: {
    Icon: PackageCheck, color: 'text-accent-green bg-accent-green/10',
    title: 'Giao hàng thành công',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã giao thành công.`),
  },
  order_canceled: {
    Icon: XCircle, color: 'text-accent-red bg-accent-red/10',
    title: 'Đơn hàng đã hủy',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} đã bị hủy.`),
  },
  order_return_requested: {
    Icon: RotateCcw, color: 'text-accent-amber bg-accent-amber/10',
    title: 'Yêu cầu trả hàng',
    body: (n) => orderBody(n, (id) => `Đơn hàng #${id} có yêu cầu trả hàng cần bạn duyệt.`),
  },
  order_return_approved: {
    Icon: BadgeCheck, color: 'text-accent-green bg-accent-green/10',
    title: 'Trả hàng được duyệt',
    body: (n) => orderBody(n, (id) => `Yêu cầu trả hàng cho đơn #${id} đã được duyệt và hoàn tiền.`),
  },
  order_return_rejected: {
    Icon: Ban, color: 'text-accent-red bg-accent-red/10',
    title: 'Trả hàng bị từ chối',
    body: (n) => orderBody(n, (id) => `Yêu cầu trả hàng cho đơn #${id} đã bị từ chối.`),
  },
  comment: {
    Icon: MessageCircle, color: 'text-accent-cyan bg-accent-cyan/10',
    title: 'Bình luận mới',
    body: (n) => socialBody(n, 'bình luận về bài viết của bạn'),
  },
  reply: {
    Icon: Reply, color: 'text-accent-cyan bg-accent-cyan/10',
    title: 'Phản hồi mới',
    body: (n) => socialBody(n, 'trả lời bình luận của bạn'),
  },
  brand_approved: {
    Icon: Tag, color: 'text-accent-green bg-accent-green/10',
    title: 'Thương hiệu được duyệt',
    body: (n) => reviewBody(n, 'Thương hiệu', true),
  },
  brand_rejected: {
    Icon: Tag, color: 'text-accent-red bg-accent-red/10',
    title: 'Thương hiệu bị từ chối',
    body: (n) => reviewBody(n, 'Thương hiệu', false),
  },
  category_approved: {
    Icon: FolderTree, color: 'text-accent-green bg-accent-green/10',
    title: 'Danh mục được duyệt',
    body: (n) => reviewBody(n, 'Danh mục', true),
  },
  category_rejected: {
    Icon: FolderTree, color: 'text-accent-red bg-accent-red/10',
    title: 'Danh mục bị từ chối',
    body: (n) => reviewBody(n, 'Danh mục', false),
  },
};

export function getNotificationMeta(type: string): NotificationMeta {
  return TYPE_CONFIG[type] ?? DEFAULT_META;
}

export function getNotificationContent(n: Notification): NotificationContent {
  const config = TYPE_CONFIG[n.type];
  if (!config) return { title: 'Thông báo', body: n.message };
  return { title: config.title, body: config.body(n) ?? n.message };
}

const ORDER_TYPES = new Set([
  'order_created', 'payment_completed', 'order_placed', 'order_confirmed',
  'order_processing', 'order_shipped', 'order_delivering', 'order_completed',
  'order_canceled',
  'order_return_requested', 'order_return_approved', 'order_return_rejected',
]);

/** Seller-side rows — the buyer's order detail is not the seller's view of it. */
const SELLER_ORDER_TYPES = new Set(['new_order']);

const SOCIAL_TYPES = new Set(['comment', 'reply']);

export function getNotificationHref(n: Notification): string | null {
  if (SELLER_ORDER_TYPES.has(n.type)) return '/sell/orders';
  if (ORDER_TYPES.has(n.type) && n.orderId != null) return `/order/${n.orderId}`;
  // Legacy comment/reply rows (pre 2026-07-06) have no postId — no deep link.
  if (SOCIAL_TYPES.has(n.type) && n.postId != null) return `/post/${n.postId}`;
  return null;
}

export { relativeTimeLong as relativeTime } from '@/lib/format/time';
