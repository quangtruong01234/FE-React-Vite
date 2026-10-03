import { defineMessages } from '@/lib/i18n/messages';

/** I18N-02 — copy for the header search box and its suggestion dropdown. */
export const searchMessages = defineMessages({
  vi: {
    submit: 'Tìm kiếm',
    placeholder: 'Tìm sản phẩm, bài viết, seller…',
    suggestions: 'Gợi ý tìm kiếm',
    searching: 'Đang tìm…',
    loadFailed: 'Không tải được gợi ý.',
    noMatch: 'Không có gợi ý nào khớp.',
    seeAll: 'Xem tất cả sản phẩm cho “{query}”',
    groupProduct: 'Sản phẩm',
    groupSeller: 'Seller',
    groupPost: 'Bài viết',
  },
  en: {
    submit: 'Search',
    placeholder: 'Search products, posts, sellers…',
    suggestions: 'Search suggestions',
    searching: 'Searching…',
    loadFailed: 'Could not load suggestions.',
    noMatch: 'No matching suggestions.',
    seeAll: 'See all products for “{query}”',
    groupProduct: 'Products',
    groupSeller: 'Sellers',
    groupPost: 'Posts',
  },
});
