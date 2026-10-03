import { defineMessages } from '@/lib/i18n/messages';

/** I18N-04 — the two client-side payment-url messages (backend messages pass through verbatim). */
export const paymentUrlMessages = defineMessages({
  vi: {
    urlMissing: 'Không nhận được đường dẫn thanh toán.',
    fallback: 'Không tạo được liên kết thanh toán. Vui lòng thử lại.',
  },
  en: {
    urlMissing: "Didn't receive a payment link.",
    fallback: "Couldn't create a payment link. Please try again.",
  },
});
