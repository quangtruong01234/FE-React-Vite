import { ShoppingCart, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GradientButton } from '@/components/shared/GradientButton';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { PriceText } from '@/components/shared/PriceText';
import { useAddToCart } from '@/hooks/data/useCart';
import type { ProductWithInventory } from '@/types';

interface ProductChipProps {
  product: ProductWithInventory;
}

export default function ProductChip({ product }: ProductChipProps) {
  const addToCart = useAddToCart();

  function handleAddToCart() {
    addToCart.mutate({ productId: Number(product.id), quantity: 1 });
  }

  return (
    <div className="flex items-center gap-3 p-2.5 bg-canvas-elevated border border-bdr rounded-tb-cta">
      <ProductThumb
        src={product.imageUrl}
        alt={product.name}
        className="w-14 h-14 rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-accent-amber">
          <Tag size={11} />
          Sản phẩm gắn kèm
        </div>
        <Link
          to={`/product/${product.id}`}
          className="block text-sm font-semibold text-ink-pri truncate hover:text-accent-amber transition-colors"
        >
          {product.name}
        </Link>
        <PriceText price={product.price} size="sm" />
      </div>

      <GradientButton size="sm" className="flex-none rounded-tb-input" onClick={handleAddToCart} disabled={addToCart.isPending}>
        <ShoppingCart size={14} />
        Mua nhanh
      </GradientButton>
    </div>
  );
}
