import { defineMessages } from '@/lib/i18n/messages';

/**
 * I18N-02 — copy for the gateway return page. `{gateway}` is the brand name (VNPay / ZaloPay)
 * and is never translated. The order id sits in its own styled span, so the success sentence is
 * split around it (`orderPaidBefore` #id `orderPaidAfter`).
 */
export const paymentMessages = defineMessages({
  vi: {
    verifying: 'Đang xác nhận thanh toán…',
    waitingGateway: 'Đang chờ phản hồi từ cổng {gateway}',
    successTitle: 'Thanh toán thành công!',
    orderPaidBefore: 'Đơn hàng',
    orderPaidAfter: 'đã được thanh toán qua {gateway}.',
    yourOrderPaid: 'Đơn hàng của bạn đã được thanh toán qua {gateway}.',
    viewOrder: 'Xem chi tiết đơn hàng →',
    viewMyOrders: 'Xem đơn hàng của tôi →',
    home: 'Về trang chủ',
    failedTitle: 'Thanh toán thất bại',
    failedBody: 'Giao dịch qua {gateway} không thành công. Vui lòng thử lại.',
    backToOrder: 'Quay lại đơn hàng',
    allOrders: 'Xem tất cả đơn hàng',
    unverifiedTitle: 'Chưa xác nhận được thanh toán',
    unverifiedBody:
      'Không nhận được phản hồi từ cổng {gateway}. Giao dịch của bạn có thể đã thành công — hãy kiểm tra đơn hàng trước khi thanh toán lại.',
    checkOrder: 'Kiểm tra đơn hàng →',
  },
  en: {
    verifying: 'Confirming your payment…',
    waitingGateway: 'Waiting for a response from {gateway}',
    successTitle: 'Payment successful!',
    orderPaidBefore: 'Order',
    orderPaidAfter: 'has been paid via {gateway}.',
    yourOrderPaid: 'Your order has been paid via {gateway}.',
    viewOrder: 'View order details →',
    viewMyOrders: 'View my orders →',
    home: 'Back to home',
    failedTitle: 'Payment failed',
    failedBody: 'The {gateway} transaction did not go through. Please try again.',
    backToOrder: 'Back to the order',
    allOrders: 'View all orders',
    unverifiedTitle: 'Payment not confirmed yet',
    unverifiedBody:
      'No response from {gateway}. Your payment may still have gone through — check your order before paying again.',
    checkOrder: 'Check the order →',
  },
});
