import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Eye, EyeOff, FlagOff, Trash2, ShieldCheck, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import { userDisplayName, userFallback, userSummaryLabel } from '@/lib/format/user';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useFilterParam } from '@/hooks/ui/useFilterParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { useTimedToast } from '@/hooks/ui/useTimedToast';
import { SearchField } from '@/components/shared/SearchField';
import { Skeleton } from '@/components/ui/skeleton';
import {
  moderationActionsFor,
  moderationErrorMessage,
  moderationSuccessMessage,
  reportStatusMeta,
  REPORT_STATUS_LABEL,
  type ModerationAction,
} from './postModeration';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { postModerationMessages, type PostModerationMessageKey } from './postModeration.i18n';
import type { PostReportStatus, ReportedPostGroup } from '@/types';

const FILTER_KEYS: readonly PostReportStatus[] = ['pending', 'resolved', 'dismissed'];

const LIMIT = 20;

const ACTION_META: Record<ModerationAction, { label: PostModerationMessageKey; pendingLabel: PostModerationMessageKey }> = {
  hide:    { label: 'actionHide',    pendingLabel: 'actionHidePending' },
  unhide:  { label: 'actionUnhide',  pendingLabel: 'actionUnhidePending' },
  dismiss: { label: 'actionDismiss', pendingLabel: 'actionDismissPending' },
  delete:  { label: 'actionDelete',  pendingLabel: 'actionDeletePending' },
};

function ActionIcon({ action }: { action: ModerationAction }): ReactElement {
  switch (action) {
    case 'hide':    return <EyeOff size={14} className="shrink-0" />;
    case 'unhide':  return <Eye size={14} className="shrink-0" />;
    case 'dismiss': return <FlagOff size={14} className="shrink-0" />;
    case 'delete':  return <Trash2 size={14} className="shrink-0" />;
  }
}

function ReportedPostCard({
  group,
  pendingAction,
  onAction,
}: {
  group: ReportedPostGroup;
  pendingAction: ModerationAction | null;
  onAction: (id: string, action: ModerationAction) => void;
}): ReactElement {
  const t = useT(postModerationMessages);
  const { lang } = useLanguage();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { post } = group;
  const busy = pendingAction !== null;
  const actions = moderationActionsFor(group);
  const imageCount = post.imageUrls?.length ?? 0;

  return (
    <div data-testid={`reported-post-${post.id}`} className="bg-canvas-surface border border-bdr rounded-tb-card p-5">
      {/* Author + moderation state */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={post.author.avatar ?? undefined} alt={post.author.username} size={34} />
          <div className="min-w-0">
            <Link
              to={`/profile/${post.author.id}`}
              className="font-body font-semibold text-sm text-ink-pri hover:text-accent-amber transition-colors truncate block"
            >
              {userDisplayName(post.author, userFallback(lang))}
            </Link>
            <span className="font-body text-xs text-ink-muted">@{post.author.username}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {post.isHidden && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border bg-tb-red/10 text-accent-red border-tb-red/20">
              <EyeOff size={11} className="shrink-0" />
              {t('hiddenFromFeed')}
            </span>
          )}
          {group.pendingCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border bg-tb-amber/10 text-accent-amber border-tb-amber/20">
              {t('pendingCount', { count: group.pendingCount })}
            </span>
          )}
        </div>
      </div>

      {/* Content preview */}
      {post.isHidden ? (
        <p className="m-0 font-body text-sm text-ink-pri line-clamp-3 whitespace-pre-wrap">{post.content}</p>
      ) : (
        <Link to={`/post/${post.id}`} className="block hover:opacity-80 transition-opacity">
          <p className="m-0 font-body text-sm text-ink-pri line-clamp-3 whitespace-pre-wrap">{post.content}</p>
        </Link>
      )}
      <div className="flex items-center gap-3 flex-wrap mt-2 font-body text-xs text-ink-muted">
        <span className="font-mono">{t('postId', { id: post.id })}</span>
        <span>{t('reportCount', { count: group.reportCount })}</span>
        {imageCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <ImageIcon size={12} className="shrink-0" />
            {t('imageCount', { count: imageCount })}
          </span>
        )}
        <span>{t('latestReport', { at: formatDateTime(group.latestReportedAt, lang) })}</span>
      </div>

      {/* Report reasons */}
      <div className="mt-3 pt-3 border-t border-bdr flex flex-col gap-1.5">
        {group.reports.map(report => {
          const meta = reportStatusMeta(report.status, lang);
          return (
            <div key={report.id} className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-body text-sm text-ink-sec min-w-0 truncate">
                <span className="font-mono text-xs text-ink-muted">
                  {userSummaryLabel(report.reporter, report.reporterId)}
                </span> · {report.reason}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-body text-xs text-ink-muted">{formatDateTime(report.createdAt, lang)}</span>
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
                  meta.className,
                )}>
                  {meta.label}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-bdr">
        {!confirmDelete ? (
          <div className="flex gap-2.5 flex-wrap">
            {actions.map(action => {
              const isDelete = action === 'delete';
              return (
                <button
                  key={action}
                  type="button"
                  disabled={busy}
                  onClick={() => (isDelete ? setConfirmDelete(true) : onAction(post.id, action))}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    isDelete
                      ? 'bg-tb-red/15 text-accent-red hover:bg-tb-red/25'
                      : 'bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri',
                  )}
                >
                  <ActionIcon action={action} />
                  {t(pendingAction === action ? ACTION_META[action].pendingLabel : ACTION_META[action].label)}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-body text-sm text-accent-red">
              {t('deleteConfirmText')}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(post.id, 'delete')}
              className="px-3 py-1.5 rounded-tb-input bg-accent-red text-ink-on-accent text-xs font-body font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {pendingAction === 'delete' ? t('actionDeletePending') : t('deleteConfirm')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-tb-input bg-canvas-elevated border border-bdr text-ink-sec text-xs font-body hover:bg-canvas-base transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportedPostsPage(): ReactElement {
  const queryClient = useQueryClient();
  const t = useT(postModerationMessages);
  const { lang } = useLanguage();
  const [filterTab, setFilterTab] = useFilterParam<PostReportStatus>('status', FILTER_KEYS, 'pending');
  const [page, setPage] = usePageParam();
  const { toast, showToast } = useTimedToast<string>();
  const search = useListSearch(() => { if (page !== 1) setPage(1); });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.social.adminReportsList(filterTab, page, search.term),
    queryFn: () => api.social.getReportedPosts(filterTab, page, LIMIT, search.term),
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });

  const moderate = useMutation<unknown, unknown, { id: string; action: ModerationAction }>({
    mutationFn: ({ id, action }: { id: string; action: ModerationAction }) => {
      switch (action) {
        case 'hide':    return api.social.hidePost(id);
        case 'unhide':  return api.social.unhidePost(id);
        case 'dismiss': return api.social.dismissReports(id);
        case 'delete':  return api.social.adminDeletePost(id);
      }
    },
    onSuccess: (_, { id, action }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.social.adminReports });
      showToast(moderationSuccessMessage(action, id, lang));
    },
  });

  const groups = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error ? moderationErrorMessage(error, 'hide', lang) : null;
  const actionErrorMsg = moderate.isError && moderate.variables
    ? moderationErrorMessage(moderate.error, moderate.variables.action, lang)
    : null;

  // setFilterTab also drops ?page= in the same URL update (useFilterParam).
  const handleTabChange = (status: PostReportStatus): void => {
    setFilterTab(status);
  };

  const pendingActionFor = (postId: string): ModerationAction | null => {
    if (!moderate.isPending || moderate.variables?.id !== postId) return null;
    return moderate.variables.action;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-pri">{t('title')}</h1>
        <p className="font-body text-sm text-ink-sec mt-1 m-0">
          {t('subtitle')}
        </p>
      </div>

      {toast && (
        <div className="bg-tb-green/15 text-accent-green border border-tb-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast}
        </div>
      )}
      {errorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {errorMsg}
        </div>
      )}
      {actionErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {moderate.variables ? <span className="font-mono font-bold">#{moderate.variables.id}</span> : null} · {actionErrorMsg}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-0.5">
        {FILTER_KEYS.map(status => {
          const active = status === filterTab;
          return (
            <button
              key={status}
              type="button"
              onClick={() => handleTabChange(status)}
              className={cn(
                'flex-none px-4 py-2 rounded-full font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border transition-colors',
                active
                  ? 'bg-tb-gradient border-transparent text-ink-on-accent'
                  : 'bg-canvas-elevated border-bdr text-ink-sec hover:text-ink-pri',
              )}
            >
              {t(REPORT_STATUS_LABEL[status])}
            </button>
          );
        })}
      </div>

      <SearchField
        value={search.input}
        onChange={search.setInput}
        placeholder={t('searchPlaceholder')}
        className="max-w-md"
      />

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 bg-canvas-elevated rounded-tb-card" />
          ))}
        </div>
      )}

      {!isLoading && !errorMsg && groups.length === 0 && (
        <div className="bg-canvas-surface border border-bdr rounded-tb-card py-14 px-6 text-center">
          <span className="flex flex-col items-center gap-2 font-body text-sm text-ink-muted">
            <ShieldCheck size={32} className="shrink-0 opacity-40" />
            {listSearchEmptyText(search, t('searchNoun'), lang)
              ?? (filterTab === 'pending' ? t('emptyPending') : t('emptyOther'))}
          </span>
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <FetchingOverlay fetching={isFetching && !isLoading}>
          <div className="flex flex-col gap-3">
            {groups.map(group => (
              <ReportedPostCard
                key={group.post.id}
                group={group}
                pendingAction={pendingActionFor(group.post.id)}
                onAction={(id, action) => moderate.mutate({ id, action })}
              />
            ))}
          </div>
        </FetchingOverlay>
      )}

      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} hasNext={data?.hasNext} onPageChange={setPage} />
      )}
    </div>
  );
}
