import { ShoppingCart, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GradientButton } from '@/components/shared/GradientButton';
import { PriceText } from '@/components/shared/PriceText';
import { useCart } from '@/context/CartContext';
import type { ProductWithInventory } from '@/types';

interface ProductChipProps {
  product: ProductWithInventory;
}

export default function ProductChip({ product }: ProductChipProps) {
  const { addItem } = useCart();

  function handleAddToCart() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.imageUrl ?? '',
      quantity: 1,
      stockQuantity: product.inventory.availableStock,
    });
  }

  return (
    <div className="flex items-center gap-3 p-2.5 bg-canvas-elevated border border-bdr rounded-tb-cta">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-14 h-14 rounded-lg flex-none object-cover"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg flex-none bg-canvas-surface flex items-center justify-center">
          <ShoppingCart size={20} className="text-ink-muted" />
        </div>
      )}

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

      <GradientButton size="sm" className="flex-none rounded-tb-input" onClick={handleAddToCart}>
        <ShoppingCart size={14} />
        Mua nhanh
      </GradientButton>
    </div>
  );
}
