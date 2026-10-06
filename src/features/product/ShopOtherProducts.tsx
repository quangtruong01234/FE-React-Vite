import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useT } from '@/hooks/ui/useT';
import ProductCard from './ProductCard';
import { useProducts } from './useProducts';
import { otherShopProducts, SHOP_OTHER_PRODUCTS_MAX } from './sellerOtherProducts';
import { productMessages } from './product.i18n';

interface ShopOtherProductsProps {
  sellerId: string;
  currentProductId: string;
  /** The seller's profile, or `null` when the seller no longer exists. */
  sellerPath: string | null;
}

/**
 * F11 — "Sản phẩm khác của shop" under a product. The list is fetched only once
 * the section nears the viewport, so it never competes with the product's own
 * request and cover image (the LCP) on load.
 */
export function ShopOtherProducts({
  sellerId,
  currentProductId,
  sellerPath,
}: ShopOtherProductsProps): ReactElement | null {
  const t = useT(productMessages);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || nearViewport) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNearViewport(true);
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nearViewport]);

  const { data } = useProducts(
    { userId: sellerId, limit: SHOP_OTHER_PRODUCTS_MAX + 1, isActive: true },
    { enabled: nearViewport && !!sellerId },
  );
  const products = otherShopProducts(data?.data, currentProductId);

  if (products.length === 0) return <div ref={sentinelRef} aria-hidden />;

  return (
    <section className="mt-12 pt-8 border-t border-bdr">
      <div className="flex items-center justify-between gap-4 mb-[18px]">
        <h2 className="font-display font-black text-2xl tracking-[-0.01em] text-ink-pri m-0">
          {t('shopOtherProducts')}
        </h2>
        {sellerPath && (
          <Link
            to={sellerPath}
            className="inline-flex items-center gap-1 font-body font-semibold text-sm text-accent-amber hover:opacity-80 transition-opacity whitespace-nowrap">
            {t('viewShop')}
            <ChevronRight size={16} className="shrink-0" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
