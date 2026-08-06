import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, BadgeCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/format/utils';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { Avatar } from '@/components/shared/Avatar';
import { PriceText } from '@/components/shared/PriceText';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import type { ProductWithInventory, PaginatedResponse } from '@/types';

const FEATURED_SELLER_LIMIT = 5;

export function RightRail(): ReactElement {
  const { data: sellersData, isLoading: loadingUsers } = useQuery({
    queryKey: queryKeys.users.featuredSellers(FEATURED_SELLER_LIMIT),
    queryFn: () => api.users.getFeaturedSellers(FEATURED_SELLER_LIMIT),
  });

  const sellers = sellersData ?? [];

  const { data: productsData, isLoading: loadingProducts } = useQuery<PaginatedResponse<ProductWithInventory>>({
    queryKey: queryKeys.products.list({ sortBy: 'viewCount', sortOrder: 'DESC', limit: 5 }),
    queryFn: () => api.products.getList({ sortBy: 'viewCount', sortOrder: 'DESC', limit: 5 }),
    // TODO: confirm backend supports sortBy=viewCount; if not, results fall back gracefully
  });

  const trending = productsData?.data ?? [];

  return (
    <aside className="sticky top-[76px] self-start hidden lg:flex flex-col gap-4 pb-20">
      {/* Seller nổi bật */}
      <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr flex items-center gap-2">
          <Store size={15} className="text-accent-amber" />
          <span className="font-display font-bold text-sm uppercase tracking-wide text-ink-pri">Seller nổi bật</span>
        </div>
        <div className="p-2">
          {loadingUsers && (
            <div className="flex flex-col gap-2 p-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full bg-canvas-elevated" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-28 bg-canvas-elevated" />
                    <Skeleton className="h-3 w-20 bg-canvas-elevated" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingUsers && sellers.length === 0 && (
            <p className="text-ink-muted text-xs px-2 py-3">Chưa có seller nổi bật.</p>
          )}
          {!loadingUsers && sellers.map(s => (
            <Link
              key={s.id}
              to={`/profile/${s.id}`}
              className="flex items-center gap-3 px-2 py-2 rounded-[10px] hover:bg-canvas-elevated transition-colors"
            >
              <Avatar src={s.avatar ?? undefined} alt={s.username} size={36} />
              <div className="min-w-0 flex-1">
                <div className={cn('text-sm font-semibold text-ink-pri truncate flex items-center gap-1')}>
                  {s.name ?? s.username}
                  <BadgeCheck size={13} className="text-accent-amber flex-none" />
                </div>
                <div className="text-[11px] text-ink-muted truncate">@{s.username}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Đang hot */}
      <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr flex items-center gap-2">
          <TrendingUp size={15} className="text-accent-amber" />
          <span className="font-display font-bold text-sm uppercase tracking-wide text-ink-pri">Đang hot</span>
        </div>
        <div className="p-2 flex flex-col gap-1">
          {loadingProducts && (
            <div className="flex flex-col gap-2 p-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-11 h-11 rounded-lg flex-none bg-canvas-elevated" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-28 bg-canvas-elevated" />
                    <Skeleton className="h-3 w-16 bg-canvas-elevated" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingProducts && trending.length === 0 && (
            <p className="text-ink-muted text-xs px-2 py-3">Chưa có sản phẩm hot.</p>
          )}
          {!loadingProducts && trending.map(p => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="flex items-center gap-3 px-2 py-2 rounded-[10px] hover:bg-canvas-elevated transition-colors"
            >
              <img
                src={cldImage(p.imageUrl ?? 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=100', 96)}
                alt={p.name}
                width={44}
                height={44}
                className="w-11 h-11 rounded-lg flex-none object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=100';
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink-pri truncate">{p.name}</div>
                <PriceText price={p.price} className="text-[13px]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
