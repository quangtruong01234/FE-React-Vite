import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle, BadgeCheck, Ban, Bell, CheckCircle, ClipboardCheck, FolderTree, Heart,
  MessageCircle, Package, PackageCheck, PackagePlus, Reply, RotateCcw, ShoppingBag, Tag,
  TrendingDown, Truck, XCircle,
} from 'lucide-react';
import { formatVnd } from '@/lib/format/utils';
import { userSummaryLabel } from '@/lib/format/user';
import { bindTranslator, type MessageKey, type Translator } from '@/lib/i18n/messages';
import type { Lang } from '@/lib/i18n/lang';
import type { Notification } from '@/types';
import { notificationMessages } from './notification.i18n';

type NotificationKey = MessageKey<typeof notificationMessages>;
type T = Translator<NotificationKey>;

export interface NotificationMeta {
  Icon: LucideIcon;
  color: string;
}

export interface NotificationContent {
  title: string;
  body: string;
}

interface TypeConfig extends NotificationMeta {
  titleKey: NotificationKey;
  /** Returns null when required data is missing → falls back to the raw backend message. */
  body: (n: Notification, t: T, lang: Lang) => string | null;
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

function reviewBody(n: Notification, t: T, subject: 'brand' | 'category', approved: boolean): string {
  const name = extractQuotedName(n.message);
  const label = name
    ? t(subject === 'brand' ? 'brandNamed' : 'categoryNamed', { name })
    : t(subject === 'brand' ? 'brandProposed' : 'categoryProposed');
  if (approved) return t('reviewApproved', { label });
  const reason = extractReason(n.message);
  return reason ? t('reviewRejectedReason', { label, reason }) : t('reviewRejected', { label });
}

function orderBody(n: Notification, t: T, key: NotificationKey): string | null {
  return n.orderId != null ? t(key, { id: n.orderId }) : null;
}

/**
 * Comment/reply: name the actor and quote the comment text when the backend
 * sent them. The `actor` embed (OVERFETCH-01) is absent on legacy rows and on
 * responses served before the backend rollout, so "Có người" stays the fallback
 * — never the raw `actorId`, which means nothing to a reader.
 */
function socialBody(n: Notification, t: T, kind: 'comment' | 'reply'): string {
  const who = userSummaryLabel(n.actor, null) ?? t('someone');
  if (n.preview) {
    return t(kind === 'comment' ? 'commentBodyQuote' : 'replyBodyQuote', { who, preview: n.preview });
  }
  return t(kind === 'comment' ? 'commentBody' : 'replyBody', { who });
}

/**
 * Likes are aggregated per post (SOCIAL-LIKE-NTF-01): the backend keeps one
 * unread row per post and rewrites its message to "<N> people liked your post"
 * as more likes land ("Someone liked your post" while N = 1). The count only
 * lives in that English message, so recover it here — anything unrecognised
 * reads as a single like.
 */
export function likeCount(message: string): number {
  const match = /^(\d+) people liked your post$/.exec(message);
  const count = match ? Number(match[1]) : 1;
  return count > 1 ? count : 1;
}

/** `actor` is the most recent liker; everyone else is summarised as a count. */
function likeBody(n: Notification, t: T): string {
  const who = userSummaryLabel(n.actor, null) ?? t('someone');
  const others = likeCount(n.message) - 1;
  return others > 0 ? t('likeBodyOthers', { who, others }) : t('likeBody', { who });
}

/**
 * Wishlist alerts (WISHLIST-ALERT-01) carry the product name in `preview`; the
 * quoted name in the English message is the fallback for a row without one.
 */
function wishlistProductName(n: Notification): string | null {
  return n.preview ?? extractQuotedName(n.message);
}

/**
 * "… dropped from 200,000 VND to 150,000 VND." — the two prices only live in
 * the English message. Unparseable text yields null, so the body drops the
 * amounts rather than showing a wrong one.
 */
export function priceDropAmounts(
  message: string,
  lang: Lang = 'vi',
): { from: string; to: string } | null {
  const match = /from ([\d,]+) VND to ([\d,]+) VND/.exec(message);
  if (!match) return null;
  return {
    from: formatVnd(match[1].replace(/,/g, ''), lang),
    to: formatVnd(match[2].replace(/,/g, ''), lang),
  };
}

function priceDropBody(n: Notification, t: T, lang: Lang): string | null {
  const name = wishlistProductName(n);
  if (!name) return null;
  const amounts = priceDropAmounts(n.message, lang);
  return amounts
    ? t('priceDropBody', { name, from: amounts.from, to: amounts.to })
    : t('priceDropBodyNoAmounts', { name });
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  order_created: {
    Icon: ShoppingBag, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'orderCreatedTitle',
    body: (n, t) => orderBody(n, t, 'orderCreatedBody'),
  },
  payment_completed: {
    Icon: CheckCircle, color: 'text-accent-green bg-tb-green/10',
    titleKey: 'paymentCompletedTitle',
    body: (n, t) => orderBody(n, t, 'paymentCompletedBody'),
  },
  order_placed: {
    Icon: ShoppingBag, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'orderCreatedTitle',
    body: (n, t) => orderBody(n, t, 'orderPlacedBody'),
  },
  // NOTIF-LIFECYCLE-01: the buyer now gets a notification at every step of the
  // lifecycle, and the seller one for each new order.
  new_order: {
    Icon: ClipboardCheck, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'newOrderTitle',
    body: (n, t) => orderBody(n, t, 'newOrderBody'),
  },
  order_confirmed: {
    Icon: BadgeCheck, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'orderConfirmedTitle',
    body: (n, t) => orderBody(n, t, 'orderConfirmedBody'),
  },
  order_processing: {
    Icon: Package, color: 'text-accent-cyan bg-tb-cyan/10',
    titleKey: 'orderProcessingTitle',
    body: (n, t) => orderBody(n, t, 'orderProcessingBody'),
  },
  order_shipped: {
    Icon: Truck, color: 'text-accent-violet bg-accent-violet/10',
    titleKey: 'orderShippedTitle',
    body: (n, t) => orderBody(n, t, 'orderShippedBody'),
  },
  order_delivering: {
    Icon: Truck, color: 'text-accent-violet bg-accent-violet/10',
    titleKey: 'orderDeliveringTitle',
    body: (n, t) => orderBody(n, t, 'orderDeliveringBody'),
  },
  order_completed: {
    Icon: PackageCheck, color: 'text-accent-green bg-tb-green/10',
    titleKey: 'orderCompletedTitle',
    body: (n, t) => orderBody(n, t, 'orderCompletedBody'),
  },
  // GHN-FAIL-NTF-01: shipper tới mà không giao được. Đơn **chưa** hủy và status
  // không đổi — GHN tự giao lại (~3 lần) trước khi chuyển sang nhóm return, nên
  // giọng văn là "chưa xong", không phải "thất bại", và icon/màu phải khác
  // `order_canceled` (XCircle đỏ = việc đã kết thúc). BE chỉ báo lần hụt ĐẦU
  // TIÊN của mỗi đơn; không có notification lần 2, lần 3.
  order_delivery_attempt_failed: {
    Icon: AlertTriangle, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'deliveryFailedTitle',
    body: (n, t) => orderBody(n, t, 'deliveryFailedBody'),
  },
  order_canceled: {
    Icon: XCircle, color: 'text-accent-red bg-tb-red/10',
    titleKey: 'orderCanceledTitle',
    body: (n, t) => orderBody(n, t, 'orderCanceledBody'),
  },
  order_return_requested: {
    Icon: RotateCcw, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'returnRequestedTitle',
    body: (n, t) => orderBody(n, t, 'returnRequestedBody'),
  },
  order_return_approved: {
    Icon: BadgeCheck, color: 'text-accent-green bg-tb-green/10',
    titleKey: 'returnApprovedTitle',
    body: (n, t) => orderBody(n, t, 'returnApprovedBody'),
  },
  order_return_rejected: {
    Icon: Ban, color: 'text-accent-red bg-tb-red/10',
    titleKey: 'returnRejectedTitle',
    body: (n, t) => orderBody(n, t, 'returnRejectedBody'),
  },
  comment: {
    Icon: MessageCircle, color: 'text-accent-cyan bg-tb-cyan/10',
    titleKey: 'commentTitle',
    body: (n, t) => socialBody(n, t, 'comment'),
  },
  reply: {
    Icon: Reply, color: 'text-accent-cyan bg-tb-cyan/10',
    titleKey: 'replyTitle',
    body: (n, t) => socialBody(n, t, 'reply'),
  },
  like: {
    Icon: Heart, color: 'text-accent-red bg-tb-red/10',
    titleKey: 'likeTitle',
    body: likeBody,
  },
  brand_approved: {
    Icon: Tag, color: 'text-accent-green bg-tb-green/10',
    titleKey: 'brandApprovedTitle',
    body: (n, t) => reviewBody(n, t, 'brand', true),
  },
  brand_rejected: {
    Icon: Tag, color: 'text-accent-red bg-tb-red/10',
    titleKey: 'brandRejectedTitle',
    body: (n, t) => reviewBody(n, t, 'brand', false),
  },
  category_approved: {
    Icon: FolderTree, color: 'text-accent-green bg-tb-green/10',
    titleKey: 'categoryApprovedTitle',
    body: (n, t) => reviewBody(n, t, 'category', true),
  },
  category_rejected: {
    Icon: FolderTree, color: 'text-accent-red bg-tb-red/10',
    titleKey: 'categoryRejectedTitle',
    body: (n, t) => reviewBody(n, t, 'category', false),
  },
  wishlist_back_in_stock: {
    Icon: PackagePlus, color: 'text-accent-green bg-tb-green/10',
    titleKey: 'backInStockTitle',
    body: (n, t) => {
      const name = wishlistProductName(n);
      return name ? t('backInStockBody', { name }) : null;
    },
  },
  wishlist_price_drop: {
    Icon: TrendingDown, color: 'text-accent-amber bg-tb-amber/10',
    titleKey: 'priceDropTitle',
    body: priceDropBody,
  },
};

export function getNotificationMeta(type: string): NotificationMeta {
  return TYPE_CONFIG[type] ?? DEFAULT_META;
}

export function getNotificationContent(n: Notification, lang: Lang = 'vi'): NotificationContent {
  const t = bindTranslator(notificationMessages, lang);
  const config = TYPE_CONFIG[n.type];
  if (!config) return { title: t('fallbackTitle'), body: n.message };
  return { title: t(config.titleKey), body: config.body(n, t, lang) ?? n.message };
}

const ORDER_TYPES = new Set([
  'order_created', 'payment_completed', 'order_placed', 'order_confirmed',
  'order_processing', 'order_shipped', 'order_delivering', 'order_completed',
  'order_canceled', 'order_delivery_attempt_failed',
  'order_return_requested', 'order_return_approved', 'order_return_rejected',
]);

/** Seller-side rows — the buyer's order detail is not the seller's view of it. */
const SELLER_ORDER_TYPES = new Set(['new_order']);

const SOCIAL_TYPES = new Set(['comment', 'reply', 'like']);

const WISHLIST_TYPES = new Set(['wishlist_back_in_stock', 'wishlist_price_drop']);

export function getNotificationHref(n: Notification): string | null {
  if (SELLER_ORDER_TYPES.has(n.type)) return '/sell/orders';
  if (WISHLIST_TYPES.has(n.type) && n.productId != null) return `/product/${n.productId}`;
  if (ORDER_TYPES.has(n.type) && n.orderId != null) return `/order/${n.orderId}`;
  // Legacy comment/reply rows (pre 2026-07-06) have no postId — no deep link.
  if (SOCIAL_TYPES.has(n.type) && n.postId != null) return `/post/${n.postId}`;
  return null;
}

export { relativeTimeLong as relativeTime } from '@/lib/format/time';
