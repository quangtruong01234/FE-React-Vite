import { Fragment, type ReactElement, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { formatDate } from '@/lib/format/time';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { toApiError } from '@/lib/http/apiError';
import { TableErrorRow } from '@/components/shared/TableErrorRow';
import { useTimedToast } from '@/hooks/ui/useTimedToast';
import { useLanguage } from '@/context/useLanguage';
import { submitterLabel } from './submitterLabel';
import { useT } from '@/hooks/ui/useT';
import { adminMessages, type AdminMessageKey } from './admin.i18n';
import type { ReviewDto } from '@/types';

const COLUMNS: readonly AdminMessageKey[] = [
  'colId',
  'categoriesColName',
  'colDescription',
  'colSubmitter',
  'colCreatedAt',
  'colActions',
];

export default function PendingCategoriesPage(): ReactElement {
  const queryClient = useQueryClient();
  const t = useT(adminMessages);
  const { lang } = useLanguage();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const { toast, showToast } = useTimedToast<{ id: number; msg: string }>();

  const { data: categories, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.categories.pending,
    queryFn: () => api.products.getPendingCategories(),
  });

  const loadError = toApiError(error);

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewDto }) =>
      api.products.reviewCategory(id, data),
    onSuccess: (_, { id, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.pending });
      showToast({ id, msg: t(data.action === 'approve' ? 'categoryApproved' : 'categoryRejected') });
      if (rejectId === id) {
        setRejectId(null);
        setRejectNote('');
      }
    },
  });

  function handleApprove(id: number): void {
    reviewMutation.mutate({ id, data: { action: 'approve' } });
  }

  function handleRejectConfirm(): void {
    if (rejectId === null) return;
    reviewMutation.mutate({ id: rejectId, data: { action: 'reject', note: rejectNote || undefined } });
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="font-display font-bold text-2xl text-ink-pri">{t('categoriesTitle')}</h1>

      {toast && (
        <div className="bg-tb-green/15 text-accent-green border border-tb-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast.msg}
        </div>
      )}

      <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bdr">
              {COLUMNS.map(h => (
                <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                  {t('loading')}
                </td>
              </tr>
            )}
            {!isLoading && loadError && (
              <TableErrorRow error={loadError} colSpan={6} onRetry={() => { void refetch(); }} />
            )}
            {!isLoading && !loadError && !categories?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-body text-sm">
                  <span className="flex flex-col items-center gap-2 text-ink-muted">
                    <Layers size={32} className="shrink-0 opacity-40" />
                    {t('categoriesEmpty')}
                  </span>
                </td>
              </tr>
            )}
            {categories?.map((category, idx) => (
              // The key belongs on the Fragment: it is the element `map` returns.
              // On the inner <tr> React never saw it and warned, and a reorder or a
              // removed row would have been reconciled by position.
              <Fragment key={category.id}>
                <tr
                  className={cn(
                    'transition-colors hover:bg-canvas-elevated',
                    (idx < (categories.length - 1) || rejectId === category.id) && 'border-b border-bdr',
                  )}
                >
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">{category.id}</td>
                  <td className="px-4 py-3 font-body font-semibold text-ink-pri text-sm">{category.name}</td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm max-w-[200px] truncate">
                    {category.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">{submitterLabel(category.submittedBy)}</td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">{formatDate(category.createdAt, lang)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={reviewMutation.isPending}
                        onClick={() => handleApprove(category.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input bg-tb-green/15 text-accent-green text-xs font-body font-semibold hover:bg-tb-green/25 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={13} className="shrink-0" />
                        {t('approve')}
                      </button>
                      <button
                        type="button"
                        disabled={reviewMutation.isPending}
                        onClick={() => {
                          setRejectId(rejectId === category.id ? null : category.id);
                          setRejectNote('');
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold transition-colors disabled:opacity-50',
                          rejectId === category.id
                            ? 'bg-tb-red/25 text-accent-red'
                            : 'bg-tb-red/15 text-accent-red hover:bg-tb-red/25',
                        )}
                      >
                        <XCircle size={13} className="shrink-0" />
                        {t('reject')}
                      </button>
                    </div>
                  </td>
                </tr>
                {rejectId === category.id && (
                  <tr className={cn(idx < (categories.length - 1) && 'border-b border-bdr')}>
                    <td colSpan={6} className="px-4 py-3 bg-canvas-elevated">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder={t('rejectNotePlaceholder')}
                          value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                          className="flex-1 bg-canvas-base border border-bdr rounded-tb-input px-3 py-1.5 text-sm font-body text-ink-pri placeholder:text-ink-muted focus:outline-none focus:border-tb-amber/60"
                        />
                        <button
                          type="button"
                          disabled={reviewMutation.isPending}
                          onClick={handleRejectConfirm}
                          className="px-3 py-1.5 rounded-tb-input bg-accent-red text-ink-on-accent text-xs font-body font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {t('confirmReject')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectId(null); setRejectNote(''); }}
                          className="px-3 py-1.5 rounded-tb-input bg-canvas-surface border border-bdr text-ink-sec text-xs font-body hover:bg-canvas-base transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
