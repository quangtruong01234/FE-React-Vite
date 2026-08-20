import { describe, it, expect, vi, afterEach } from 'vitest';
import { Bell } from 'lucide-react';
import type { Notification } from '@/types';
import {
  getNotificationMeta,
  getNotificationContent,
  getNotificationHref,
  relativeTime,
} from './notificationDisplay';

function notif(partial: Partial<Notification> = {}): Notification {
  return {
    id: 'ntf_0000000000000001',
    userId: 'usr_0000000000000001',
    type: 'order_placed',
    orderId: 'ord_0000000000000042',
    postId: null,
    actorId: null,
    preview: null,
    message: 'raw backend message',
    isRead: false,
    createdAt: '2026-06-24T00:00:00.000Z',
    ...partial,
  };
}

describe('getNotificationContent', () => {
  it('renders the order-created notification from its orderId', () => {
    const content = getNotificationContent(notif({ type: 'order_created', orderId: 'ord_0000000000000118' }));
    expect(content.title).toBe('Đặt hàng thành công');
    expect(content.body).toBe('Đơn hàng #ord_0000000000000118 đã được đặt thành công.');
  });

  it('builds Vietnamese title + body for order types from orderId', () => {
    const content = getNotificationContent(notif({ type: 'payment_completed', orderId: 'ord_0000000000000007' }));
    expect(content.title).toBe('Thanh toán thành công');
    expect(content.body).toBe('Đơn hàng #ord_0000000000000007 đã được thanh toán thành công.');
  });

  it('covers every return-flow type', () => {
    expect(getNotificationContent(notif({ type: 'order_return_requested' })).body)
      .toBe('Đơn hàng #ord_0000000000000042 có yêu cầu trả hàng cần bạn duyệt.');
    expect(getNotificationContent(notif({ type: 'order_return_approved' })).body)
      .toBe('Yêu cầu trả hàng cho đơn #ord_0000000000000042 đã được duyệt và hoàn tiền.');
    expect(getNotificationContent(notif({ type: 'order_return_rejected' })).body)
      .toBe('Yêu cầu trả hàng cho đơn #ord_0000000000000042 đã bị từ chối.');
  });

  it('renders every lifecycle type the backend now emits (NOTIF-LIFECYCLE-01)', () => {
    // Before this batch these fell through to "Thông báo" + the raw English message.
    const cases: Array<[string, string, string]> = [
      ['new_order', 'Đơn hàng mới', 'Bạn có đơn hàng mới #ord_0000000000000042 cần xác nhận.'],
      ['order_confirmed', 'Đơn hàng đã xác nhận', 'Đơn hàng #ord_0000000000000042 đã được người bán xác nhận.'],
      ['order_processing', 'Đang chuẩn bị hàng', 'Đơn hàng #ord_0000000000000042 đang được chuẩn bị để giao.'],
      ['order_delivering', 'Đang giao đến bạn', 'Đơn hàng #ord_0000000000000042 đang trên đường giao đến bạn.'],
      ['order_completed', 'Giao hàng thành công', 'Đơn hàng #ord_0000000000000042 đã giao thành công.'],
    ];
    for (const [type, title, body] of cases) {
      const content = getNotificationContent(notif({ type }));
      expect(content.title, type).toBe(title);
      expect(content.body, type).toBe(body);
    }
  });

  it('falls back to the raw message when an order type has no orderId', () => {
    const content = getNotificationContent(notif({ type: 'order_canceled', orderId: null }));
    expect(content.title).toBe('Đơn hàng đã hủy');
    expect(content.body).toBe('raw backend message');
  });

  it('replaces generic English comment/reply messages with Vietnamese text when preview is missing', () => {
    expect(getNotificationContent(notif({ type: 'comment', message: 'Someone commented on your post' })).body)
      .toBe('Có người vừa bình luận về bài viết của bạn.');
    expect(getNotificationContent(notif({ type: 'reply', message: 'Someone replied to your comment' })).body)
      .toBe('Có người vừa trả lời bình luận của bạn.');
  });

  it('appends the comment/reply preview when the backend sends it', () => {
    expect(getNotificationContent(notif({ type: 'comment', preview: 'Sản phẩm đẹp quá!' })).body)
      .toBe('Có người vừa bình luận về bài viết của bạn: “Sản phẩm đẹp quá!”');
    expect(getNotificationContent(notif({ type: 'reply', preview: 'Cảm ơn bạn nhé' })).body)
      .toBe('Có người vừa trả lời bình luận của bạn: “Cảm ơn bạn nhé”');
  });

  it('names the actor when the backend hydrated it (OVERFETCH-01)', () => {
    const actor = { id: 'usr_0000000000000009', username: 'quang', avatar: null };
    expect(getNotificationContent(notif({ type: 'comment', actorId: actor.id, actor })).body)
      .toBe('@quang vừa bình luận về bài viết của bạn.');
    expect(getNotificationContent(notif({ type: 'reply', actorId: actor.id, actor, preview: 'Cảm ơn bạn nhé' })).body)
      .toBe('@quang vừa trả lời bình luận của bạn: “Cảm ơn bạn nhé”');
  });

  it('keeps the generic wording — never the raw actorId — when the actor embed is missing', () => {
    // Pre-rollout responses carry `actorId` with no `actor`; "#usr_..." would be
    // meaningless to a reader, so the fallback stays "Có người".
    expect(getNotificationContent(notif({ type: 'comment', actorId: 'usr_0000000000000009' })).body)
      .toBe('Có người vừa bình luận về bài viết của bạn.');
    expect(getNotificationContent(notif({ type: 'comment', actorId: 'usr_0000000000000009', actor: null })).body)
      .toBe('Có người vừa bình luận về bài viết của bạn.');
  });

  it('renders order types with a bigint-string orderId', () => {
    expect(getNotificationContent(notif({ type: 'payment_completed', orderId: 'ord_0000000000000107' })).body)
      .toBe('Đơn hàng #ord_0000000000000107 đã được thanh toán thành công.');
  });

  it('extracts the brand name from the backend message', () => {
    const content = getNotificationContent(notif({
      type: 'brand_approved',
      orderId: null,
      message: "Your brand 'Nike' has been approved.",
    }));
    expect(content.title).toBe('Thương hiệu được duyệt');
    expect(content.body).toBe("Thương hiệu 'Nike' đã được duyệt.");
  });

  it('extracts the rejection reason when present', () => {
    const content = getNotificationContent(notif({
      type: 'category_rejected',
      orderId: null,
      message: "Your category 'Shoes' was rejected. Reason: duplicate of Footwear",
    }));
    expect(content.body).toBe("Danh mục 'Shoes' đã bị từ chối. Lý do: duplicate of Footwear");
  });

  it('handles review messages without a quoted name or reason', () => {
    const content = getNotificationContent(notif({
      type: 'brand_rejected',
      orderId: null,
      message: 'Your brand was rejected.',
    }));
    expect(content.body).toBe('Thương hiệu bạn đề xuất đã bị từ chối.');
  });

  it('falls back to raw message + generic title for unknown types', () => {
    const content = getNotificationContent(notif({ type: 'mystery', message: 'hello' }));
    expect(content.title).toBe('Thông báo');
    expect(content.body).toBe('hello');
  });
});

describe('getNotificationHref', () => {
  it('links order types to the order detail page', () => {
    expect(getNotificationHref(notif({ type: 'order_created', orderId: 'ord_0000000000000118' }))).toBe('/order/ord_0000000000000118');
    expect(getNotificationHref(notif({ type: 'order_shipped', orderId: 'ord_0000000000000009' }))).toBe('/order/ord_0000000000000009');
    expect(getNotificationHref(notif({ type: 'order_return_approved', orderId: 'ord_0000000000000009' }))).toBe('/order/ord_0000000000000009');
  });

  it('links order types with a bigint-string orderId', () => {
    expect(getNotificationHref(notif({ type: 'order_shipped', orderId: 'ord_0000000000000107' }))).toBe('/order/ord_0000000000000107');
  });

  it('links the new buyer lifecycle types to the order detail page', () => {
    for (const type of ['order_confirmed', 'order_processing', 'order_delivering', 'order_completed']) {
      expect(getNotificationHref(notif({ type })), type).toBe('/order/ord_0000000000000042');
    }
  });

  it('sends the seller new-order row to the seller queue, not the buyer detail', () => {
    // `/order/:id` is the buyer's view — a seller opening it gets a 403.
    expect(getNotificationHref(notif({ type: 'new_order' }))).toBe('/sell/orders');
    expect(getNotificationHref(notif({ type: 'new_order', orderId: null }))).toBe('/sell/orders');
  });

  it('links comment/reply to the post when postId is present', () => {
    expect(getNotificationHref(notif({ type: 'comment', orderId: null, postId: 'post_0000000000000008' }))).toBe('/post/post_0000000000000008');
    expect(getNotificationHref(notif({ type: 'reply', orderId: null, postId: 'post_0000000000000008' }))).toBe('/post/post_0000000000000008');
  });

  it('does not link legacy comment/reply rows without a postId', () => {
    expect(getNotificationHref(notif({ type: 'comment', orderId: 'ord_0000000000000123', postId: null }))).toBeNull();
    expect(getNotificationHref(notif({ type: 'reply', orderId: 'ord_0000000000000123', postId: null }))).toBeNull();
  });

  it('does not link order types missing an orderId or unknown types', () => {
    expect(getNotificationHref(notif({ type: 'order_placed', orderId: null }))).toBeNull();
    expect(getNotificationHref(notif({ type: 'brand_approved', orderId: null }))).toBeNull();
  });
});

describe('getNotificationMeta', () => {
  it('maps every backend type to a non-default icon', () => {
    const types = [
      'order_created', 'payment_completed', 'order_placed', 'order_shipped', 'order_canceled',
      'new_order', 'order_confirmed', 'order_processing', 'order_delivering', 'order_completed',
      'order_return_requested', 'order_return_approved', 'order_return_rejected',
      'comment', 'reply', 'brand_approved', 'brand_rejected',
      'category_approved', 'category_rejected',
    ];
    for (const type of types) {
      expect(getNotificationMeta(type).Icon, type).not.toBe(Bell);
    }
  });

  it('falls back to the bell for unknown types', () => {
    expect(getNotificationMeta('mystery').Icon).toBe(Bell);
  });
});

describe('relativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats minutes, hours and days in Vietnamese', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-24T12:00:00.000Z'));
    expect(relativeTime('2026-06-24T11:59:40.000Z')).toBe('Vừa xong');
    expect(relativeTime('2026-06-24T11:45:00.000Z')).toBe('15 phút trước');
    expect(relativeTime('2026-06-24T09:00:00.000Z')).toBe('3 giờ trước');
    expect(relativeTime('2026-06-21T12:00:00.000Z')).toBe('3 ngày trước');
  });
});
