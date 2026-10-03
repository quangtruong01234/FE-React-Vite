import { defineMessages, plural } from '@/lib/i18n/messages';

/** I18N-02 — copy for the wishlist page. */
export const wishlistMessages = defineMessages({
  vi: {
    title: 'Yêu thích',
    count: '{count} sản phẩm',
    searchPlaceholder: 'Tìm theo tên sản phẩm…',
    productsNoun: 'sản phẩm',
    loadFailed: 'Không thể tải danh sách yêu thích. Vui lòng thử lại.',
    emptyTitle: 'Chưa có sản phẩm yêu thích',
    emptyHint: 'Nhấn vào biểu tượng trái tim trên sản phẩm để lưu lại đây.',
    explore: 'Khám phá sản phẩm',
  },
  en: {
    title: 'Wishlist',
    count: ({ count }) => `${count} ${plural(Number(count), 'product', 'products')}`,
    searchPlaceholder: 'Search by product name…',
    productsNoun: 'products',
    loadFailed: 'Could not load your wishlist. Please try again.',
    emptyTitle: 'No favourite products yet',
    emptyHint: 'Tap the heart icon on a product to save it here.',
    explore: 'Explore products',
  },
});
