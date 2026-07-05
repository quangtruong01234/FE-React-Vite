import type {
  ApiError,
  PostReportStatus,
  ReportedPostGroup,
} from '@/types';

/**
 * Pure helpers for the admin post-moderation queue (F5).
 *
 * Backend contract: `GET /social/admin/reports` groups reports per post;
 * Hide flips the post's pending reports → resolved, Dismiss flips them →
 * dismissed (post stays visible), Unhide restores feed visibility without
 * re-opening reports, Delete removes the post + all its report rows.
 */

export type ModerationAction = 'hide' | 'unhide' | 'dismiss' | 'delete';

export interface ReportStatusMeta {
  label: string;
  className: string;
}

const REPORT_STATUS_META: Record<PostReportStatus, ReportStatusMeta> = {
  pending:   { label: 'Chờ xử lý',  className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  resolved:  { label: 'Đã xử lý',   className: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  dismissed: { label: 'Đã bỏ qua',  className: 'bg-canvas-elevated text-ink-sec border-bdr' },
};

export function reportStatusMeta(status: PostReportStatus): ReportStatusMeta {
  return REPORT_STATUS_META[status] ?? REPORT_STATUS_META.pending;
}

/**
 * Actions applicable to a grouped reported post:
 * hide/unhide toggle on visibility, dismiss only while reports are pending,
 * delete is always available.
 */
export function moderationActionsFor(group: ReportedPostGroup): ModerationAction[] {
  const actions: ModerationAction[] = [];
  actions.push(group.post.isHidden ? 'unhide' : 'hide');
  if (group.pendingCount > 0) actions.push('dismiss');
  actions.push('delete');
  return actions;
}

const ACTION_DONE_LABEL: Record<ModerationAction, string> = {
  hide:    'Đã ẩn bài viết',
  unhide:  'Đã hiện lại bài viết',
  dismiss: 'Đã bỏ qua báo cáo của bài viết',
  delete:  'Đã xoá vĩnh viễn bài viết',
};

export function moderationSuccessMessage(action: ModerationAction, postId: number): string {
  return `${ACTION_DONE_LABEL[action]} #${postId}.`;
}

const ACTION_FAIL_LABEL: Record<ModerationAction, string> = {
  hide:    'Không thể ẩn bài viết',
  unhide:  'Không thể hiện lại bài viết',
  dismiss: 'Không thể bỏ qua báo cáo',
  delete:  'Không thể xoá bài viết',
};

/** Friendly message for a failed moderation action (404 = post already gone). */
export function moderationErrorMessage(error: unknown, action: ModerationAction): string {
  const err = error as Partial<ApiError> | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) {
    return 'Bài viết không còn tồn tại — có thể đã bị xoá. Hãy tải lại danh sách.';
  }
  if (status === 403) {
    return 'Bạn không có quyền kiểm duyệt bài viết.';
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return `${ACTION_FAIL_LABEL[action]}. Vui lòng thử lại.`;
}
