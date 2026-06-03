import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import type { ProductWithInventory } from '@/types';

interface ProductCardProps {
  product: ProductWithInventory;
}

export default function ProductCard({ product }: ProductCardProps): ReactElement {
  const { addItem } = useCart();
  const stock = product.inventory?.availableStock ?? 0;
  const outOfStock = stock === 0;

  function handleAddToCart(): void {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.imageUrl ?? '',
      quantity: 1,
      stockQuantity: stock,
    });
  }

  return (
    <div className={cn(
      'bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden flex flex-col',
      'transition-all duration-300 hover:-translate-y-1 hover:border-accent-amber/30 hover:shadow-tb-card group',
    )}>
      <Link to={`/product/${product.id}`} className="relative block">
        <img
          src={product.imageUrl ?? ''}
          alt={product.name}
          width={400}
          height={400}
          className="w-full aspect-square object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
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
      </Link>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <Link
          to={`/product/${product.id}`}
          className="font-body font-medium text-sm text-ink-pri leading-snug line-clamp-2 hover:text-accent-amber transition-colors min-h-[2.5em]"
        >
          {product.name}
        </Link>

        {product.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-ink-sec">
            <Star size={12} className="text-accent-amber" fill="#F59E0B" />
            <span>{product.rating}</span>
            <span className="text-ink-muted">({product.ratingCount.toLocaleString('vi-VN')})</span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2">
          <span className="font-mono text-accent-amber font-semibold text-base">
            {formatPrice(product.price)}
          </span>
          <button
            disabled={outOfStock}
            onClick={handleAddToCart}
            className={cn(
              'w-9 h-9 rounded-tb-input bg-tb-gradient text-ink-pri flex items-center justify-center border-0 shadow-tb-cta',
              'hover:opacity-90 active:scale-95 transition flex-none cursor-pointer',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
            )}
            aria-label="Thêm vào giỏ"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
