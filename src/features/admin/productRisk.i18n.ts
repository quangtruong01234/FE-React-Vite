import { defineMessages, plural, type MessageKey } from '@/lib/i18n/messages';

/** I18N-06 — copy for the product-risk queue (`/admin/product-risk`) and its helpers. */
export const productRiskMessages = defineMessages({
  vi: {
    // Score tiers.
    scoreHigh: 'Rủi ro cao',
    scoreMedium: 'Rủi ro trung bình',
    scoreLow: 'Rủi ro thấp',
    scoreNone: 'Không có cờ',

    // Flag reasons — money arrives pre-formatted, percentages as whole numbers.
    flagDuplicateImage: 'Ảnh gần trùng với sản phẩm #{id} của seller khác (khoảng cách hash {distance})',
    flagPriceAnomaly: 'Giá {price} thấp bất thường so với trung vị danh mục {median} (bằng {percent}%)',
    flagSimilarName: 'Tên gần trùng với sản phẩm #{id} (tương đồng {percent}%)',

    // Errors.
    failList: 'Không thể tải hàng đợi rủi ro. Vui lòng thử lại.',
    failRescore: 'Không thể chấm điểm lại sản phẩm. Vui lòng thử lại.',
    failBackfill: 'Không thể xếp hàng chấm điểm sản phẩm cũ. Vui lòng thử lại.',
    failFeedback: 'Không thể ghi nhận đánh giá kiểm duyệt. Vui lòng thử lại.',
    errorGone: 'Sản phẩm không còn tồn tại — có thể đã bị xoá. Hãy tải lại danh sách.',
    errorForbidden: 'Bạn không có quyền xem hàng đợi rủi ro sản phẩm.',

    // Scoring state + retry detail.
    statusPending: 'Đang chờ chấm điểm',
    statusFailed: 'Chấm điểm lỗi',
    retryAttempts: 'đã thử {count} lần',
    retryAt: 'thử lại lúc {at}',
    retryError: 'lỗi: {error}',

    // Backfill button.
    backfillPending: 'Đang xếp hàng...',
    backfillIdle: 'Chấm điểm sản phẩm cũ',
    backfillResume: 'Tiếp tục backfill (đã xếp {count})',
    backfillDone: 'Backfill hoàn tất — đã xếp {count}',

    // Filter tabs.
    filterFlagged: 'Có cờ',
    filterMedium: 'Từ trung bình',
    filterHigh: 'Rủi ro cao',
    filterAll: 'Tất cả sản phẩm',

    // Card.
    productId: 'SP #{id}',
    sellerId: 'Seller #{id}',
    hiddenFromStore: 'Đang ẩn khỏi sàn',
    viewMatched: 'Xem SP #{id}',
    viewProduct: 'Xem sản phẩm',
    rescorePending: 'Đang chấm điểm...',
    rescore: 'Chấm điểm lại',
    confirmDuplicate: 'Xác nhận trùng',
    dismissWarning: 'Bỏ qua cảnh báo',

    // Toasts.
    rescored: 'Đã chấm điểm lại sản phẩm #{id} — điểm rủi ro mới: {score}/100.',
    duplicateConfirmed: 'Đã ghi nhận xác nhận trùng lặp cho sản phẩm #{id}.',
    duplicateDismissed: 'Đã bỏ qua cảnh báo trùng lặp cho sản phẩm #{id}.',

    // Page.
    title: 'Rủi ro sản phẩm',
    intro:
      'Hàng đợi cảnh báo tự động — ảnh trùng giữa các seller, giá thấp bất thường, tên gần trùng. Điểm chỉ mang tính tham khảo, không tự động gỡ sản phẩm.',
    searchPlaceholder: 'Tìm theo tên sản phẩm…',
    searchNoun: 'sản phẩm',
    emptyFlagged: 'Không có sản phẩm nào bị gắn cờ ở mức này.',
    emptyAll: 'Chưa có sản phẩm nào.',
  },
  en: {
    scoreHigh: 'High risk',
    scoreMedium: 'Medium risk',
    scoreLow: 'Low risk',
    scoreNone: 'No flags',

    flagDuplicateImage: 'Image nearly matches product #{id} from another seller (hash distance {distance})',
    flagPriceAnomaly: 'Price {price} is unusually low against the category median {median} ({percent}% of it)',
    flagSimilarName: 'Name nearly matches product #{id} ({percent}% similar)',

    failList: 'Could not load the risk queue. Please try again.',
    failRescore: 'Could not rescore the product. Please try again.',
    failBackfill: 'Could not queue the older products for scoring. Please try again.',
    failFeedback: 'Could not record the moderation review. Please try again.',
    errorGone: 'This product no longer exists — it may have been deleted. Reload the list.',
    errorForbidden: 'You do not have permission to view the product-risk queue.',

    statusPending: 'Waiting to be scored',
    statusFailed: 'Scoring failed',
    retryAttempts: ({ count }) => `tried ${count} ${plural(Number(count), 'time', 'times')}`,
    retryAt: 'retrying at {at}',
    retryError: 'error: {error}',

    backfillPending: 'Queuing...',
    backfillIdle: 'Score older products',
    backfillResume: 'Continue backfill ({count} queued)',
    backfillDone: 'Backfill complete — {count} queued',

    filterFlagged: 'Flagged',
    filterMedium: 'Medium and up',
    filterHigh: 'High risk',
    filterAll: 'All products',

    productId: 'Product #{id}',
    sellerId: 'Seller #{id}',
    hiddenFromStore: 'Hidden from the store',
    viewMatched: 'View product #{id}',
    viewProduct: 'View product',
    rescorePending: 'Scoring...',
    rescore: 'Rescore',
    confirmDuplicate: 'Confirm duplicate',
    dismissWarning: 'Dismiss warning',

    rescored: 'Rescored product #{id} — new risk score: {score}/100.',
    duplicateConfirmed: 'Recorded product #{id} as a confirmed duplicate.',
    duplicateDismissed: 'Dismissed the duplicate warning for product #{id}.',

    title: 'Product risk',
    intro:
      'An automatic warning queue — images shared across sellers, unusually low prices, near-duplicate names. Scores are advisory only and never unlist a product.',
    searchPlaceholder: 'Search by product name…',
    searchNoun: 'products',
    emptyFlagged: 'No products are flagged at this level.',
    emptyAll: 'No products yet.',
  },
});

export type ProductRiskMessageKey = MessageKey<typeof productRiskMessages>;
