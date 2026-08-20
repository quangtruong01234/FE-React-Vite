import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Eye, EyeOff, FlagOff, Trash2, ShieldCheck, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import { userSummaryLabel } from '@/lib/format/user';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useFilterParam } from '@/hooks/ui/useFilterParam';
import { Skeleton } from '@/components/ui/skeleton';
import {
  moderationActionsFor,
  moderationErrorMessage,
  moderationSuccessMessage,
  reportStatusMeta,
  type ModerationAction,
} from './postModeration';
import type { PostReportStatus, ReportedPostGroup } from '@/types';

const FILTER_OPTS: { id: PostReportStatus; label: string }[] = [
  { id: 'pending',   label: 'Chờ xử lý' },
  { id: 'resolved',  label: 'Đã xử lý' },
  { id: 'dismissed', label: 'Đã bỏ qua' },
];

const FILTER_KEYS: readonly PostReportStatus[] = FILTER_OPTS.map(o => o.id);

const LIMIT = 20;

const ACTION_META: Record<ModerationAction, { label: string; pendingLabel: string }> = {
  hide:    { label: 'Ẩn bài viết',    pendingLabel: 'Đang ẩn...' },
  unhide:  { label: 'Hiện lại',       pendingLabel: 'Đang hiện...' },
  dismiss: { label: 'Bỏ qua báo cáo', pendingLabel: 'Đang bỏ qua...' },
  delete:  { label: 'Xoá vĩnh viễn',  pendingLabel: 'Đang xoá...' },
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { post } = group;
  const busy = pendingAction !== null;
  const actions = moderationActionsFor(group);
  const imageCount = post.imageUrls?.length ?? 0;

  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card p-5">
      {/* Author + moderation state */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar src={post.author.avatar ?? undefined} alt={post.author.username} size={34} />
          <div className="min-w-0">
            <Link
              to={`/profile/${post.author.id}`}
              className="font-body font-semibold text-sm text-ink-pri hover:text-accent-amber transition-colors truncate block"
            >
              {post.author.name ?? post.author.username}
            </Link>
            <span className="font-body text-xs text-ink-muted">@{post.author.username}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {post.isHidden && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border bg-accent-red/10 text-accent-red border-accent-red/20">
              <EyeOff size={11} className="shrink-0" />
              Đang ẩn khỏi feed
            </span>
          )}
          {group.pendingCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border bg-accent-amber/10 text-accent-amber border-accent-amber/20">
              {group.pendingCount} chờ xử lý
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
        <span className="font-mono">Bài #{post.id}</span>
        <span>{group.reportCount} báo cáo</span>
        {imageCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <ImageIcon size={12} className="shrink-0" />
            {imageCount} ảnh
          </span>
        )}
        <span>Báo cáo gần nhất: {formatDateTime(group.latestReportedAt)}</span>
      </div>

      {/* Report reasons */}
      <div className="mt-3 pt-3 border-t border-bdr flex flex-col gap-1.5">
        {group.reports.map(report => {
          const meta = reportStatusMeta(report.status);
          return (
            <div key={report.id} className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-body text-sm text-ink-sec min-w-0 truncate">
                <span className="font-mono text-xs text-ink-muted">
                  {userSummaryLabel(report.reporter, report.reporterId)}
                </span> · {report.reason}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-body text-xs text-ink-muted">{formatDateTime(report.createdAt)}</span>
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
                      ? 'bg-accent-red/15 text-accent-red hover:bg-accent-red/25'
                      : 'bg-canvas-elevated border border-bdr text-ink-sec hover:border-accent-amber/50 hover:text-ink-pri',
                  )}
                >
                  <ActionIcon action={action} />
                  {pendingAction === action ? ACTION_META[action].pendingLabel : ACTION_META[action].label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-body text-sm text-accent-red">
              Xoá vĩnh viễn bài viết và toàn bộ báo cáo? Hành động này không thể hoàn tác.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction(post.id, 'delete')}
              className="px-3 py-1.5 rounded-tb-input bg-accent-red text-white text-xs font-body font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            >
              {pendingAction === 'delete' ? 'Đang xoá...' : 'Xác nhận xoá'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-tb-input bg-canvas-elevated border border-bdr text-ink-sec text-xs font-body hover:bg-canvas-base transition-colors cursor-pointer"
            >
              Huỷ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportedPostsPage(): ReactElement {
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useFilterParam<PostReportStatus>('status', FILTER_KEYS, 'pending');
  const [page, setPage] = usePageParam();
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.social.adminReportsList(filterTab, page),
    queryFn: () => api.social.getReportedPosts(filterTab, page, LIMIT),
    // Keep the previous page rendered while the next one loads (no empty flash).
    placeholderData: keepPreviousData,
  });

  function showToast(msg: string): void {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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
      showToast(moderationSuccessMessage(action, id));
    },
  });

  const groups = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const errorMsg = error ? moderationErrorMessage(error, 'hide') : null;
  const actionErrorMsg = moderate.isError && moderate.variables
    ? moderationErrorMessage(moderate.error, moderate.variables.action)
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
        <h1 className="font-display font-bold text-2xl text-ink-pri">Kiểm duyệt bài viết</h1>
        <p className="font-body text-sm text-ink-sec mt-1 m-0">
          Xử lý bài viết bị báo cáo — ẩn, hiện lại, bỏ qua báo cáo hoặc xoá vĩnh viễn
        </p>
      </div>

      {toast && (
        <div className="bg-accent-green/15 text-accent-green border border-accent-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast}
        </div>
      )}
      {errorMsg && (
        <div className="bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {errorMsg}
        </div>
      )}
      {actionErrorMsg && (
        <div className="bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {moderate.variables ? <span className="font-mono font-bold">#{moderate.variables.id}</span> : null} · {actionErrorMsg}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-0.5">
        {FILTER_OPTS.map(opt => {
          const active = opt.id === filterTab;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleTabChange(opt.id)}
              className={cn(
                'flex-none px-4 py-2 rounded-full font-body font-semibold text-[13px] cursor-pointer whitespace-nowrap border transition-colors',
                active
                  ? 'bg-tb-gradient border-transparent text-white'
                  : 'bg-canvas-elevated border-bdr text-ink-sec hover:text-ink-pri',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

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
            {filterTab === 'pending' ? 'Không có bài viết nào chờ xử lý.' : 'Không có báo cáo nào trong mục này.'}
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
