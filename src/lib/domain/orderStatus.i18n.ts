import { defineMessages } from '@/lib/i18n/messages';

/**
 * I18N-04 — order-status labels, keyed by the backend status value itself, so
 * `orderStatusLabel(status, lang)` needs no lookup table of its own.
 */
export const orderStatusMessages = defineMessages({
  vi: {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipped: 'Đang vận chuyển',
    delivering: 'Đang giao',
    completed: 'Hoàn thành',
    canceled: 'Đã hủy',
    return_requested: 'Yêu cầu trả hàng',
    refunded: 'Đã hoàn tiền',
  },
  en: {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivering: 'Out for delivery',
    completed: 'Completed',
    canceled: 'Canceled',
    return_requested: 'Return requested',
    refunded: 'Refunded',
  },
});
