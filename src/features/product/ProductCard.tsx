import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingCart } from 'lucide-react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { formatPrice } from '@/lib/format/utils';
import { useAddToCart } from '@/hooks/data/useCart';
import { IconButton } from '@/components/shared/IconButton';
import { WishlistButton } from '@/components/shared/WishlistButton';
import type { ProductWithInventory } from '@/types';

interface ProductCardProps {
  product: ProductWithInventory;
}

export default function ProductCard({ product }: ProductCardProps): ReactElement {
  const addToCart = useAddToCart();
  const stock = product.inventory?.availableStock ?? 0;
  const outOfStock = stock === 0;
  const coverImage = product.imageUrl ?? product.imageUrls?.[0] ?? '';

  function handleAddToCart(): void {
    addToCart.mutate({ productId: Number(product.id), quantity: 1 });
  }

  return (
    <div className={cn(
      'bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col',
      'transition-all duration-300 hover:-translate-y-1 hover:border-accent-amber/30 hover:shadow-tb-card group',
    )}>
      <Link to={`/product/${product.id}`} className="relative block">
        {coverImage ? (
          <img
            src={coverImage}
            alt={product.name}
            width={400}
            height={400}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-square bg-canvas-elevated flex items-center justify-center">
            <ShoppingCart size={32} className="text-ink-muted shrink-0" />
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-tb-gradient text-ink-pri font-display font-black text-[10px] tracking-wider uppercase rounded-tb-pill">
              🔥 Hot
            </span>
          )}
          {product.condition !== 'new' && (
            <span className="inline-flex px-2 py-1 bg-black/70 text-ink-pri text-[10px] font-semibold rounded-tb-pill backdrop-blur-sm uppercase">
              {product.condition === 'used' ? 'Đã dùng' : 'Refurb'}
            </span>
          )}
          {product.brand && (
            <span className="inline-flex px-2 py-1 bg-canvas-elevated/90 text-ink-sec text-[10px] font-medium rounded-tb-pill backdrop-blur-sm border border-bdr">
              {product.brand.name}
            </span>
          )}
        </div>
        {outOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="font-display font-black uppercase text-ink-pri text-sm tracking-wide border border-ink-pri/40 rounded-tb-ghost px-3 py-1.5">
              Hết hàng
            </span>
          </div>
        )}
        <WishlistButton
          productId={Number(product.id)}
          iconSize={16}
          className="absolute top-2.5 right-2.5 size-8 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/60 z-10"
        />
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link
          to={`/product/${product.id}`}
          className="font-body font-medium text-sm text-ink-pri leading-snug line-clamp-2 hover:text-accent-amber transition-colors min-h-[2.5em]"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2 text-[11px] text-ink-muted">
          {product.ratingCount > 0 ? (
            <span className="flex items-center gap-0.5">
              <Star size={11} className="text-accent-amber shrink-0" fill="currentColor" />
              <span className="text-ink-sec font-medium">{product.rating.toFixed(1)}</span>
              <span>({product.ratingCount.toLocaleString('vi-VN')})</span>
            </span>
          ) : (
            <span className="flex items-center gap-0.5">
              <Star size={11} className="text-ink-muted shrink-0" />
              <span>Chưa có đánh giá</span>
            </span>
          )}
          {product.viewCount > 0 && (
            <span className="text-ink-muted">· {product.viewCount.toLocaleString('vi-VN')} lượt xem</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-mono text-accent-amber font-semibold text-base leading-none">
            {formatPrice(product.price)}
          </span>
          <IconButton
            disabled={outOfStock || addToCart.isPending}
            onClick={handleAddToCart}
            aria-label="Thêm vào giỏ"
            className={cn(
              'size-8 rounded-lg bg-tb-gradient text-ink-pri shadow-tb-cta flex-none',
              'hover:opacity-90 active:scale-95 transition cursor-pointer',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
            )}
          >
            <Plus size={16} className="shrink-0" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
