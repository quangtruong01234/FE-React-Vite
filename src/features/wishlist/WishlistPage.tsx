import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Heart, HeartOff } from 'lucide-react';
import { useWishlistPage } from '@/hooks/data/useWishlist';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { WishlistButton } from '@/components/shared/WishlistButton';
import { SearchField } from '@/components/shared/SearchField';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/format/utils';
import { productCoverImage } from '@/lib/domain/productImage';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import type { WishlistItem } from '@/types';
import { wishlistMessages } from './wishlist.i18n';

const PAGE_SIZE = 12;

function WishlistCard({ item, priority = false }: { item: WishlistItem; priority?: boolean }): ReactElement {
  const { lang } = useLanguage();
  const cover = productCoverImage(item) ?? '';
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:border-tb-amber/30 hover:shadow-tb-card">
      <Link to={`/product/${item.id}`} className="relative block">
        {cover ? (
          <img
            src={cldImage(cover, 600)}
            alt={item.name}
            width={400}
            height={400}
            className="w-full aspect-square object-cover"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          <div className="w-full aspect-square bg-canvas-elevated grid place-items-center">
            <Heart size={32} className="text-ink-muted shrink-0" />
          </div>
        )}
        {item.brand && (
          <span className="absolute top-2.5 left-2.5 inline-flex px-2 py-1 bg-tb-elevated/90 text-ink-sec text-[10px] font-medium rounded-tb-pill backdrop-blur-sm border border-bdr">
            {item.brand.name}
          </span>
        )}
        <WishlistButton
          productId={item.id}
          iconSize={18}
          className="absolute top-2.5 right-2.5 size-9 rounded-full bg-canvas-elevated/90 backdrop-blur-sm border border-bdr hover:bg-canvas-elevated"
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
          {formatPrice(item.price, lang)}
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
  const [page, setPage] = usePageParam();
  const { lang } = useLanguage();
  const t = useT(wishlistMessages);
  const search = useListSearch(() => { if (page !== 1) setPage(1); });
  const { data, isLoading, isFetching, error } = useWishlistPage(page, PAGE_SIZE, search.term);
  const items = data?.data ?? [];
  const searchEmptyText = listSearchEmptyText(search, t('productsNoun'), lang);

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="font-display font-black text-3xl uppercase tracking-tight text-ink-pri m-0 flex items-center gap-2.5">
            <Heart size={26} className="text-accent-red shrink-0 fill-current" />
            {t('title')}
          </h1>
          <p className="text-sm text-ink-sec m-0">{data ? t('count', { count: data.total }) : ''}</p>
        </div>

        <SearchField
          value={search.input}
          onChange={search.setInput}
          placeholder={t('searchPlaceholder')}
          className="max-w-md mb-6"
        />

        {error && (
          <div className="mb-4 px-4 py-3 rounded-tb-ghost bg-tb-red/10 border border-tb-red/30 text-accent-red text-sm font-body">
            {(error as { message?: string }).message ?? t('loadFailed')}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : items.length === 0 && searchEmptyText ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <HeartOff size={48} className="text-ink-muted shrink-0" />
            <p className="font-display font-bold text-lg text-ink-pri m-0">{searchEmptyText}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <HeartOff size={48} className="text-ink-muted shrink-0" />
            <div>
              <p className="font-display font-bold text-lg text-ink-pri m-0">
                {t('emptyTitle')}
              </p>
              <p className="text-sm text-ink-muted mt-1 m-0">
                {t('emptyHint')}
              </p>
            </div>
            <Link
              to="/marketplace"
              className="px-4 py-2 rounded-tb-ghost border border-bdr text-ink-sec text-sm font-body hover:bg-canvas-elevated hover:text-ink-pri transition-colors"
            >
              {t('explore')}
            </Link>
          </div>
        ) : (
          <FetchingOverlay fetching={isFetching && !isLoading}>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* First row (≤ 4 cols) is above the fold → eager, high priority. */}
              {items.map((item, i) => <WishlistCard key={item.id} item={item} priority={i < 4} />)}
            </div>
          </FetchingOverlay>
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
