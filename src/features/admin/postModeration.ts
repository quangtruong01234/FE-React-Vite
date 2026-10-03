import type {
  ApiError,
  PostReportStatus,
  ReportedPostGroup,
} from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { postModerationMessages, type PostModerationMessageKey } from './postModeration.i18n';

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

/** Label keys per status — also the filter-tab labels on the queue page. */
export const REPORT_STATUS_LABEL: Record<PostReportStatus, PostModerationMessageKey> = {
  pending:   'statusPending',
  resolved:  'statusResolved',
  dismissed: 'statusDismissed',
};

const REPORT_STATUS_CLASS: Record<PostReportStatus, string> = {
  pending:   'bg-tb-amber/10 text-accent-amber border-tb-amber/20',
  resolved:  'bg-tb-green/10 text-accent-green border-tb-green/20',
  dismissed: 'bg-canvas-elevated text-ink-sec border-bdr',
};

export function reportStatusMeta(status: PostReportStatus, lang: Lang = 'vi'): ReportStatusMeta {
  const known: PostReportStatus = Object.prototype.hasOwnProperty.call(REPORT_STATUS_CLASS, status)
    ? status
    : 'pending';
  return {
    label: bindTranslator(postModerationMessages, lang)(REPORT_STATUS_LABEL[known]),
    className: REPORT_STATUS_CLASS[known],
  };
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

const ACTION_DONE: Record<ModerationAction, PostModerationMessageKey> = {
  hide:    'doneHide',
  unhide:  'doneUnhide',
  dismiss: 'doneDismiss',
  delete:  'doneDelete',
};

export function moderationSuccessMessage(action: ModerationAction, postId: string, lang: Lang = 'vi'): string {
  return bindTranslator(postModerationMessages, lang)(ACTION_DONE[action], { id: postId });
}

const ACTION_FAIL: Record<ModerationAction, PostModerationMessageKey> = {
  hide:    'failHide',
  unhide:  'failUnhide',
  dismiss: 'failDismiss',
  delete:  'failDelete',
};

/**
 * Friendly message for a failed moderation action (404 = post already gone).
 * A server message passes through untranslated — it is the backend's copy.
 */
export function moderationErrorMessage(error: unknown, action: ModerationAction, lang: Lang = 'vi'): string {
  const t = bindTranslator(postModerationMessages, lang);
  const err = error as Partial<ApiError> | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 404) return t('errorGone');
  if (status === 403) return t('errorForbidden');
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return t(ACTION_FAIL[action]);
}
