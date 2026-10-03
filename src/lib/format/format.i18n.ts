import { defineMessages } from '@/lib/i18n/messages';

/** I18N-07 — the words inside shared formatters: compact money, the nameless-person label. */
export const formatMessages = defineMessages({
  vi: {
    // `formatPrice` from one million up; the currency stays VND in both languages.
    priceMillions: '{amount} triệu đ',
    currencySuffix: 'đ',
    userFallback: 'Người dùng',
  },
  en: {
    priceMillions: '{amount}M ₫',
    currencySuffix: '₫',
    userFallback: 'User',
  },
});
