import { defineMessages, plural, type MessageKey } from '@/lib/i18n/messages';

/** I18N-06 — copy for the post-moderation queue (`/admin/reports`) and its helpers. */
export const postModerationMessages = defineMessages({
  vi: {
    // Report status (filter tabs + per-report pill).
    statusPending: 'Chờ xử lý',
    statusResolved: 'Đã xử lý',
    statusDismissed: 'Đã bỏ qua',

    // Action buttons.
    actionHide: 'Ẩn bài viết',
    actionHidePending: 'Đang ẩn...',
    actionUnhide: 'Hiện lại',
    actionUnhidePending: 'Đang hiện...',
    actionDismiss: 'Bỏ qua báo cáo',
    actionDismissPending: 'Đang bỏ qua...',
    actionDelete: 'Xoá vĩnh viễn',
    actionDeletePending: 'Đang xoá...',

    // Success toasts — `{id}` is the post id.
    doneHide: 'Đã ẩn bài viết #{id}.',
    doneUnhide: 'Đã hiện lại bài viết #{id}.',
    doneDismiss: 'Đã bỏ qua báo cáo của bài viết #{id}.',
    doneDelete: 'Đã xoá vĩnh viễn bài viết #{id}.',

    // Errors.
    failHide: 'Không thể ẩn bài viết. Vui lòng thử lại.',
    failUnhide: 'Không thể hiện lại bài viết. Vui lòng thử lại.',
    failDismiss: 'Không thể bỏ qua báo cáo. Vui lòng thử lại.',
    failDelete: 'Không thể xoá bài viết. Vui lòng thử lại.',
    errorGone: 'Bài viết không còn tồn tại — có thể đã bị xoá. Hãy tải lại danh sách.',
    errorForbidden: 'Bạn không có quyền kiểm duyệt bài viết.',

    // Card.
    hiddenFromFeed: 'Đang ẩn khỏi feed',
    pendingCount: '{count} chờ xử lý',
    postId: 'Bài #{id}',
    reportCount: '{count} báo cáo',
    imageCount: '{count} ảnh',
    latestReport: 'Báo cáo gần nhất: {at}',
    deleteConfirmText: 'Xoá vĩnh viễn bài viết và toàn bộ báo cáo? Hành động này không thể hoàn tác.',
    deleteConfirm: 'Xác nhận xoá',
    cancel: 'Huỷ',

    // Page.
    title: 'Kiểm duyệt bài viết',
    subtitle: 'Xử lý bài viết bị báo cáo — ẩn, hiện lại, bỏ qua báo cáo hoặc xoá vĩnh viễn',
    searchPlaceholder: 'Tìm theo nội dung bài viết…',
    searchNoun: 'bài viết',
    emptyPending: 'Không có bài viết nào chờ xử lý.',
    emptyOther: 'Không có báo cáo nào trong mục này.',
  },
  en: {
    statusPending: 'Pending',
    statusResolved: 'Resolved',
    statusDismissed: 'Dismissed',

    actionHide: 'Hide post',
    actionHidePending: 'Hiding...',
    actionUnhide: 'Unhide',
    actionUnhidePending: 'Unhiding...',
    actionDismiss: 'Dismiss reports',
    actionDismissPending: 'Dismissing...',
    actionDelete: 'Delete permanently',
    actionDeletePending: 'Deleting...',

    doneHide: 'Post #{id} hidden.',
    doneUnhide: 'Post #{id} is visible again.',
    doneDismiss: 'Reports on post #{id} dismissed.',
    doneDelete: 'Post #{id} permanently deleted.',

    failHide: 'Could not hide the post. Please try again.',
    failUnhide: 'Could not unhide the post. Please try again.',
    failDismiss: 'Could not dismiss the reports. Please try again.',
    failDelete: 'Could not delete the post. Please try again.',
    errorGone: 'This post no longer exists — it may have been deleted. Reload the list.',
    errorForbidden: 'You do not have permission to moderate posts.',

    hiddenFromFeed: 'Hidden from the feed',
    pendingCount: '{count} pending',
    postId: 'Post #{id}',
    reportCount: ({ count }) => `${count} ${plural(Number(count), 'report', 'reports')}`,
    imageCount: ({ count }) => `${count} ${plural(Number(count), 'image', 'images')}`,
    latestReport: 'Latest report: {at}',
    deleteConfirmText: 'Permanently delete this post and all its reports? This cannot be undone.',
    deleteConfirm: 'Confirm delete',
    cancel: 'Cancel',

    title: 'Post moderation',
    subtitle: 'Handle reported posts — hide, unhide, dismiss the reports or delete permanently',
    searchPlaceholder: 'Search post content…',
    searchNoun: 'posts',
    emptyPending: 'No posts waiting for review.',
    emptyOther: 'No reports in this tab.',
  },
});

export type PostModerationMessageKey = MessageKey<typeof postModerationMessages>;
