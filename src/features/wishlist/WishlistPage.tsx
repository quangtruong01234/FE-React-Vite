import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Heart, HeartOff } from 'lucide-react';
import { useWishlistPage } from '@/hooks/data/useWishlist';
import { WishlistButton } from '@/components/shared/WishlistButton';
import { Pagination } from '@/components/shared/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format/utils';
import type { WishlistItem } from '@/types';

const PAGE_SIZE = 12;

function WishlistCard({ item }: { item: WishlistItem }): ReactElement {
  const cover = item.imageUrl ?? item.imageUrls?.[0] ?? '';
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-accent-amber/30 hover:shadow-tb-card">
      <Link to={`/product/${item.id}`} className="relative block">
        {cover ? (
          <img
            src={cover}
            alt={item.name}
            width={400}
            height={400}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-square bg-canvas-elevated grid place-items-center">
            <Heart size={32} className="text-ink-muted shrink-0" />
          </div>
        )}
        {item.brand && (
          <span className="absolute top-2.5 left-2.5 inline-flex px-2 py-1 bg-canvas-elevated/90 text-ink-sec text-[10px] font-medium rounded-tb-pill backdrop-blur-sm border border-bdr">
            {item.brand.name}
          </span>
        )}
        <WishlistButton
          productId={Number(item.id)}
          iconSize={18}
          className="absolute top-2.5 right-2.5 size-9 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60"
        />
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link
          to={`/product/${item.id}`}
          className="font-body font-medium text-sm text-ink-pri leading-snug line-clamp-2 hover:text-accent-amber transition-colors min-h-[2.5em]"
        >
          {item.name}
        </Link>
        <span className="mt-auto font-mono text-accent-amber font-semibold text-base leading-none">
          {formatPrice(item.price)}
        </span>
      </div>
    </div>
  );
}

function CardSkeleton(): ReactElement {
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col">
      <Skeleton className="w-full aspect-square bg-canvas-elevated" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-full bg-canvas-elevated rounded" />
        <Skeleton className="h-5 w-24 bg-canvas-elevated rounded mt-1" />
      </div>
    </div>
  );
}

export default function WishlistPage(): ReactElement {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useWishlistPage(page, PAGE_SIZE);
  const items = data?.data ?? [];

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl uppercase tracking-tight text-ink-pri m-0 flex items-center gap-2.5">
            <Heart size={26} className="text-accent-red shrink-0 fill-current" />
            Yêu thích
          </h1>
          <p className="text-sm text-ink-sec m-0">{data ? `${data.total} sản phẩm` : ''}</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-tb-ghost bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm font-body">
            {(error as { message?: string }).message ?? 'Không thể tải danh sách yêu thích. Vui lòng thử lại.'}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <HeartOff size={48} className="text-ink-muted shrink-0" />
            <div>
              <p className="font-display font-bold text-lg text-ink-pri m-0">
                Chưa có sản phẩm yêu thích
              </p>
              <p className="text-sm text-ink-muted mt-1 m-0">
                Nhấn vào biểu tượng trái tim trên sản phẩm để lưu lại đây.
              </p>
            </div>
            <Link
              to="/marketplace"
              className="px-4 py-2 rounded-tb-ghost border border-bdr text-ink-sec text-sm font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => <WishlistCard key={item.id} item={item} />)}
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            hasNext={data?.hasNext ?? false}
            onPageChange={setPage}
            className="mt-6 pt-4 border-t border-bdr"
          />
        )}
      </div>
    </div>
  );
}
