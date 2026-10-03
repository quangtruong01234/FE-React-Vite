import { describe, it, expect, vi, afterEach } from 'vitest';
import { Bell } from 'lucide-react';
import type { Notification } from '@/types';
import {
  getNotificationMeta,
  getNotificationContent,
  getNotificationHref,
  likeCount,
  priceDropAmounts,
  relativeTime,
} from './notificationDisplay';
import { formatVnd } from '@/lib/format/utils';

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

  it('renders the delivery-attempt-failed type as "chưa xong", never as a failure (GHN-FAIL-NTF-01)', () => {
    const content = getNotificationContent(notif({
      type: 'order_delivery_attempt_failed',
      message: 'Đơn hàng #ord_0000000000000042 giao chưa thành công, đơn vị vận chuyển sẽ giao lại trong thời gian tới',
    }));
    expect(content.title).toBe('Giao hàng chưa thành công');
    expect(content.body)
      .toBe('Đơn hàng #ord_0000000000000042 giao chưa thành công, đơn vị vận chuyển sẽ giao lại.');
    // The order is NOT canceled and its status has not changed — GHN redelivers
    // on its own, so wording that reads as final is a regression.
    expect(content.title).not.toMatch(/thất bại|hủy/);
    expect(content.body).not.toMatch(/thất bại|hủy/);
  });

  it('falls back to the raw message when a delivery-attempt row has no orderId', () => {
    const content = getNotificationContent(notif({
      type: 'order_delivery_attempt_failed',
      orderId: null,
    }));
    expect(content.title).toBe('Giao hàng chưa thành công');
    expect(content.body).toBe('raw backend message');
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

  it('names the latest liker on a single like (SOCIAL-LIKE-NTF-01)', () => {
    const actor = { id: 'usr_0000000000000009', username: 'quang', avatar: null };
    const content = getNotificationContent(notif({
      type: 'like', orderId: null, postId: 'post_0000000000000008', actorId: actor.id, actor,
      message: 'Someone liked your post',
    }));
    expect(content.title).toBe('Lượt thích mới');
    expect(content.body).toBe('@quang đã thích bài viết của bạn.');
  });

  it('summarises an aggregated like row as "<actor> và N-1 người khác"', () => {
    const actor = { id: 'usr_0000000000000009', username: 'quang', avatar: null };
    expect(getNotificationContent(notif({ type: 'like', actor, message: '5 people liked your post' })).body)
      .toBe('@quang và 4 người khác đã thích bài viết của bạn.');
    expect(getNotificationContent(notif({ type: 'like', message: '2 people liked your post' })).body)
      .toBe('Có người và 1 người khác đã thích bài viết của bạn.');
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

  it('deep-links a delivery-attempt-failed row to the order detail page (GHN-FAIL-NTF-01)', () => {
    expect(getNotificationHref(notif({ type: 'order_delivery_attempt_failed', orderId: 'ord_eL9elTVZeYIqR4SZ' })))
      .toBe('/order/ord_eL9elTVZeYIqR4SZ');
    expect(getNotificationHref(notif({ type: 'order_delivery_attempt_failed', orderId: null }))).toBeNull();
  });

  it('links comment/reply to the post when postId is present', () => {
    expect(getNotificationHref(notif({ type: 'comment', orderId: null, postId: 'post_0000000000000008' }))).toBe('/post/post_0000000000000008');
    expect(getNotificationHref(notif({ type: 'reply', orderId: null, postId: 'post_0000000000000008' }))).toBe('/post/post_0000000000000008');
  });

  it('links a like row to the liked post', () => {
    expect(getNotificationHref(notif({ type: 'like', orderId: null, postId: 'post_0000000000000008' })))
      .toBe('/post/post_0000000000000008');
    expect(getNotificationHref(notif({ type: 'like', orderId: null, postId: null }))).toBeNull();
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
      'order_delivery_attempt_failed',
      'comment', 'reply', 'like', 'brand_approved', 'brand_rejected',
      'category_approved', 'category_rejected',
    ];
    for (const type of types) {
      expect(getNotificationMeta(type).Icon, type).not.toBe(Bell);
    }
  });

  it('does not reuse the canceled-order icon for a missed delivery (GHN-FAIL-NTF-01)', () => {
    // BE asked for this explicitly: a missed attempt is bad-news-but-not-over,
    // so it must not look like a cancellation in the bell list.
    const attempt = getNotificationMeta('order_delivery_attempt_failed');
    expect(attempt.Icon).not.toBe(getNotificationMeta('order_canceled').Icon);
    expect(attempt.color).not.toBe(getNotificationMeta('order_canceled').color);
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

describe('likeCount', () => {
  it('reads N from the aggregated backend message', () => {
    expect(likeCount('2 people liked your post')).toBe(2);
    expect(likeCount('127 people liked your post')).toBe(127);
  });

  it('treats the single-like message and anything unrecognised as 1', () => {
    expect(likeCount('Someone liked your post')).toBe(1);
    expect(likeCount('0 people liked your post')).toBe(1);
    expect(likeCount('')).toBe(1);
  });
});

describe('wishlist alerts (WISHLIST-ALERT-01)', () => {
  const restock = notif({
    type: 'wishlist_back_in_stock',
    orderId: null,
    productId: 'prod_ffc7fd3181d211f1',
    preview: 'Sạc nhanh 20W',
    message: "'Sạc nhanh 20W' from your wishlist is back in stock.",
  });
  const priceDrop = notif({
    type: 'wishlist_price_drop',
    orderId: null,
    productId: 'prod_ffc7fd3181d211f1',
    preview: 'Sạc nhanh 20W',
    message: "'Sạc nhanh 20W' from your wishlist dropped from 200,000 VND to 150,000 VND.",
  });

  it('deep-links both types to the product page', () => {
    expect(getNotificationHref(restock)).toBe('/product/prod_ffc7fd3181d211f1');
    expect(getNotificationHref(priceDrop)).toBe('/product/prod_ffc7fd3181d211f1');
  });

  it('leaves a row without a productId unclickable', () => {
    expect(getNotificationHref({ ...restock, productId: null })).toBeNull();
    expect(getNotificationHref({ ...priceDrop, productId: undefined })).toBeNull();
  });

  it('ignores a productId on other types', () => {
    expect(getNotificationHref(notif({ type: 'brand_approved', orderId: null, productId: 'prod_x' }))).toBeNull();
  });

  it('renders the restock row in Vietnamese from the preview name', () => {
    expect(getNotificationContent(restock)).toEqual({
      title: 'Sản phẩm yêu thích có hàng',
      body: "'Sạc nhanh 20W' trong danh sách yêu thích đã có hàng trở lại.",
    });
  });

  it('renders the price-drop row with both amounts in VND', () => {
    const content = getNotificationContent(priceDrop);
    expect(content.title).toBe('Sản phẩm yêu thích giảm giá');
    expect(content.body).toBe(
      `'Sạc nhanh 20W' trong danh sách yêu thích đã giảm giá từ ${(200000).toLocaleString('vi-VN')} đ xuống ${(150000).toLocaleString('vi-VN')} đ.`,
    );
  });

  it('drops the amounts when the message cannot be parsed', () => {
    expect(getNotificationContent({ ...priceDrop, message: 'Price changed' }).body)
      .toBe("'Sạc nhanh 20W' trong danh sách yêu thích vừa giảm giá.");
  });

  it('falls back to the quoted name, then to the raw message', () => {
    expect(getNotificationContent({ ...restock, preview: null }).body)
      .toBe("'Sạc nhanh 20W' trong danh sách yêu thích đã có hàng trở lại.");
    expect(getNotificationContent({ ...restock, preview: null, message: 'Back in stock' }).body)
      .toBe('Back in stock');
  });

  it('gives both types their own icon', () => {
    expect(getNotificationMeta('wishlist_back_in_stock').Icon).not.toBe(Bell);
    expect(getNotificationMeta('wishlist_price_drop').Icon).not.toBe(Bell);
  });
});

describe('priceDropAmounts', () => {
  it('parses grouped VND amounts', () => {
    expect(priceDropAmounts('x dropped from 35 VND to 30 VND.')).toEqual({ from: formatVnd(35), to: formatVnd(30) });
    expect(priceDropAmounts('x dropped from 1,250,000 VND to 999,000 VND.'))
      .toEqual({ from: formatVnd(1250000), to: formatVnd(999000) });
  });

  it('returns null for an unrecognised message', () => {
    expect(priceDropAmounts('dropped to 150,000 VND')).toBeNull();
  });
});

describe('getNotificationContent in English (I18N-05)', () => {
  const actor = { id: 'usr_0000000000000009', username: 'quang', avatar: null };

  it('renders order lifecycle rows from the orderId', () => {
    const content = getNotificationContent(notif({ type: 'order_delivering' }), 'en');
    expect(content.title).toBe('On its way to you');
    expect(content.body).toBe('Order #ord_0000000000000042 is on its way to you.');
  });

  it('names the actor and quotes the preview on social rows', () => {
    expect(getNotificationContent(notif({ type: 'comment', actor, preview: 'Nice!' }), 'en').body)
      .toBe('@quang commented on your post: “Nice!”');
    expect(getNotificationContent(notif({ type: 'reply', actor: null }), 'en').body)
      .toBe('Someone replied to your comment.');
  });

  it('pluralises the aggregated like row', () => {
    expect(getNotificationContent(notif({ type: 'like', actor, message: '2 people liked your post' }), 'en').body)
      .toBe('@quang and 1 other liked your post.');
    expect(getNotificationContent(notif({ type: 'like', actor, message: '5 people liked your post' }), 'en').body)
      .toBe('@quang and 4 others liked your post.');
  });

  it('keeps the rejection reason the backend sent', () => {
    const content = getNotificationContent(
      notif({ type: 'brand_rejected', message: "Your brand 'Nike' was rejected. Reason: duplicate" }),
      'en',
    );
    expect(content.title).toBe('Brand rejected');
    expect(content.body).toBe("Brand 'Nike' was rejected. Reason: duplicate");
  });

  it('formats the wishlist price drop', () => {
    const content = getNotificationContent(notif({
      type: 'wishlist_price_drop',
      preview: 'Charger',
      message: "'Charger' dropped from 200,000 VND to 150,000 VND.",
    }), 'en');
    expect(content.body).toBe(
      `'Charger' on your wishlist dropped from 200,000 ₫ to 150,000 ₫.`,
    );
  });

  it('falls back to a generic title and the raw message for an unknown type', () => {
    expect(getNotificationContent(notif({ type: 'mystery' }), 'en'))
      .toEqual({ title: 'Notification', body: 'raw backend message' });
  });
});

describe('priceDropAmounts in English (I18N-07)', () => {
  it('formats both amounts as en-US grouped ₫', () => {
    expect(priceDropAmounts('x dropped from 1,250,000 VND to 999,000 VND.', 'en'))
      .toEqual({ from: '1,250,000 ₫', to: '999,000 ₫' });
  });
});
