import { type ReactElement, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import type { ReviewDto } from '@/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function PendingCategoriesPage(): ReactElement {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: queryKeys.categories.pending,
    queryFn: () => api.products.getPendingCategories(),
  });

  function showToast(id: number, msg: string): void {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 3000);
  }

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewDto }) =>
      api.products.reviewCategory(id, data),
    onSuccess: (_, { id, data }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.pending });
      showToast(id, data.action === 'approve' ? 'Đã duyệt danh mục.' : 'Đã từ chối danh mục.');
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
      <h1 className="font-display font-bold text-2xl text-ink-pri">Duyệt danh mục</h1>

      {toast && (
        <div className="bg-accent-green/15 text-accent-green border border-accent-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast.msg}
        </div>
      )}

      <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bdr">
              {['ID', 'Tên danh mục', 'Mô tả', 'Người gửi', 'Ngày tạo', 'Hành động'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-muted font-body text-sm">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && !categories?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center font-body text-sm">
                  <span className="flex flex-col items-center gap-2 text-ink-muted">
                    <Layers size={32} className="shrink-0 opacity-40" />
                    Không có danh mục chờ duyệt.
                  </span>
                </td>
              </tr>
            )}
            {categories?.map((category, idx) => (
              <>
                <tr
                  key={category.id}
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
                  <td className="px-4 py-3 font-mono text-ink-sec text-xs">#{category.submittedBy}</td>
                  <td className="px-4 py-3 font-body text-ink-sec text-sm">{formatDate(category.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={reviewMutation.isPending}
                        onClick={() => handleApprove(category.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input bg-accent-green/15 text-accent-green text-xs font-body font-semibold hover:bg-accent-green/25 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={13} className="shrink-0" />
                        Duyệt
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
                            ? 'bg-accent-red/25 text-accent-red'
                            : 'bg-accent-red/15 text-accent-red hover:bg-accent-red/25',
                        )}
                      >
                        <XCircle size={13} className="shrink-0" />
                        Từ chối
                      </button>
                    </div>
                  </td>
                </tr>
                {rejectId === category.id && (
                  <tr key={`reject-${category.id}`} className={cn(idx < (categories.length - 1) && 'border-b border-bdr')}>
                    <td colSpan={6} className="px-4 py-3 bg-canvas-elevated">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Lý do từ chối (tuỳ chọn)"
                          value={rejectNote}
                          onChange={e => setRejectNote(e.target.value)}
                          className="flex-1 bg-canvas-base border border-bdr rounded-tb-input px-3 py-1.5 text-sm font-body text-ink-pri placeholder:text-ink-muted focus:outline-none focus:border-accent-amber/60"
                        />
                        <button
                          type="button"
                          disabled={reviewMutation.isPending}
                          onClick={handleRejectConfirm}
                          className="px-3 py-1.5 rounded-tb-input bg-accent-red text-white text-xs font-body font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          Xác nhận từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => { setRejectId(null); setRejectNote(''); }}
                          className="px-3 py-1.5 rounded-tb-input bg-canvas-surface border border-bdr text-ink-sec text-xs font-body hover:bg-canvas-base transition-colors"
                        >
                          Huỷ
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
