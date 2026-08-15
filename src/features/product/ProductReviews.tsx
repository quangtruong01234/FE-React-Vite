import { useState } from 'react';
import { useAuthContext } from '@/context/useAuthContext';
import { useProductReviews, useDeleteReview } from '@/hooks/data/useProductReviews';
import { StarRating } from '@/components/shared/StarRating';

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { currentUser } = useAuthContext();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProductReviews(productId, page);
  const deleteReview = useDeleteReview(productId);

  const total = data?.total ?? 0;

  return (
    <section className="mt-12 pt-8 border-t border-bdr">
      <h2 className="font-display font-black text-2xl tracking-[-0.01em] text-ink-pri m-0 mb-6">
        Đánh giá sản phẩm ({total})
      </h2>

      {isLoading && (
        <p className="font-body text-sm text-ink-sec">Đang tải đánh giá…</p>
      )}

      {!isLoading && data && (
        <>
          {data.data.length === 0 ? (
            <p className="font-body text-sm text-ink-sec">Chưa có đánh giá nào</p>
          ) : (
            <div className="flex flex-col gap-4">
              {data.data.map((review) => (
                <div key={review.id} className="p-4 bg-canvas-surface border border-bdr rounded-tb-card flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <StarRating rating={review.rating} />
                    <span className="font-body text-xs text-ink-muted">
                      {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="m-0 font-body text-sm text-ink-sec">{review.comment}</p>
                  )}

                  {currentUser?.id === review.userId && (
                    <div>
                      <button
                        type="button"
                        disabled={deleteReview.isPending}
                        onClick={() => deleteReview.mutate(review.id)}
                        className="font-body text-xs text-accent-red hover:opacity-70 transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.totalPages > 1 && (
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-1.5 rounded-tb-input border border-bdr bg-canvas-elevated font-body text-sm text-ink-sec hover:border-accent-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Trước
              </button>
              <span className="font-body text-sm text-ink-muted">
                {page} / {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-1.5 rounded-tb-input border border-bdr bg-canvas-elevated font-body text-sm text-ink-sec hover:border-accent-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
