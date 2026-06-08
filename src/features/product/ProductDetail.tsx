import { useState, useEffect, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Shield, RotateCcw, Heart, ShoppingCart, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useCart, useAddToCart } from '@/hooks/useCart';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PriceText } from '@/components/shared/PriceText';
import { GradientButton } from '@/components/shared/GradientButton';
import { Avatar } from '@/components/shared/Avatar';

const trustItems = [
  { Icon: Truck,     label: 'Giao 24h',          sub: 'Toàn quốc'  },
  { Icon: Shield,    label: 'Bảo hành 12 tháng', sub: 'Chính hãng' },
  { Icon: RotateCcw, label: 'Đổi trả 7 ngày',    sub: 'Miễn phí'   },
];

const FALLBACK = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600';

export default function ProductDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cart } = useCart();
  const addToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedTiers, setSelectedTiers] = useState<Record<number, number>>({});
  const [variantError, setVariantError] = useState('');

  useEffect(() => {
    setSelectedTiers({});
    setVariantError('');
  }, [id]);

  const { data: detail, isLoading: loading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.getWithInventory(Number(id)),
    enabled: !!id,
  });
if (loading) {
    return (
      <div className="min-h-screen bg-canvas-base">
        <div className="bg-canvas-surface border-b border-bdr px-5 py-3">
          <Skeleton className="h-8 w-24 bg-canvas-elevated rounded-lg" />
        </div>
        <div className="max-w-[1080px] mx-auto px-8 pt-6 grid lg:grid-cols-[1.15fr_1fr] gap-12">
          <div className="flex flex-col gap-3">
            <Skeleton className="w-full aspect-square bg-canvas-elevated rounded-[20px]" />
            <div className="flex gap-2.5">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="w-[84px] h-[84px] bg-canvas-elevated rounded-xl" />)}
            </div>
          </div>
          <div className="flex flex-col gap-5 pt-4">
            <Skeleton className="h-4 w-40 bg-canvas-elevated rounded" />
            <Skeleton className="h-10 w-3/4 bg-canvas-elevated rounded" />
            <Skeleton className="h-4 w-48 bg-canvas-elevated rounded" />
            <Skeleton className="h-12 w-1/2 bg-canvas-elevated rounded" />
            <Skeleton className="h-14 w-full bg-canvas-elevated rounded-xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    const msg = error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Không tìm thấy sản phẩm.';
    return (
      <div className="min-h-screen bg-canvas-base flex flex-col items-center justify-center gap-3">
        <p className="text-ink-sec m-0">{msg}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors">
          Quay lại
        </button>
      </div>
    );
  }

  const inventory  = detail.inventory;
  const available  = inventory?.availableStock ?? null;
  const isLowStock = inventory?.isLowStock ?? false;
  const maxQty     = available != null ? Math.min(available, 99) : 99;
  const inCart     = cart?.items.find(i => i.productId === detail.id);
  const sellerName = detail.brand?.name ?? detail.user?.name ?? 'Shop Official';
  const gallery    = (detail.imageUrls?.length ?? 0) > 0
    ? (detail.imageUrls as string[])
    : [detail.imageUrl ?? FALLBACK];

  const hasVariants = (detail.variations?.length ?? 0) > 0;
  const allTiersSelected = !hasVariants ||
    (detail.variations ?? []).every((_, i) => selectedTiers[i] !== undefined);
  const matchedSku = (hasVariants && allTiersSelected)
    ? detail.skus?.find(s => s.tierIdx.every((v, i) => v === selectedTiers[i]))
    : undefined;
  const effectivePrice = (hasVariants && matchedSku) ? matchedSku.price : Number(detail.price);
  const skuOutOfStock = hasVariants && allTiersSelected && matchedSku != null && matchedSku.stockQuantity === 0;

  function handleSelectTier(tierIdx: number, optIdx: number): void {
    setSelectedTiers(prev => ({ ...prev, [tierIdx]: optIdx }));
    if (variantError) setVariantError('');
  }

  function handleAddToCart(): void {
    if (!detail) return;
    if (hasVariants) {
      if (!allTiersSelected) {
        setVariantError('Vui lòng chọn đầy đủ phân loại sản phẩm');
        return;
      }
      if (!matchedSku) {
        setVariantError('Phân loại này hiện không có hàng');
        return;
      }
      addToCart.mutate({ productId: Number(detail.id), quantity, skuId: Number(matchedSku.id) }, {
        onSuccess: () => window.dispatchEvent(new CustomEvent('tb:opencart')),
      });
    } else {
      addToCart.mutate({ productId: Number(detail.id), quantity }, {
        onSuccess: () => window.dispatchEvent(new CustomEvent('tb:opencart')),
      });
    }
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={16} /> Quay lại
        </button>
      </div>

      <div className="max-w-[1080px] mx-auto px-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 py-5 font-body text-xs text-tb-muted">
          <button
            onClick={() => navigate('/')}
            className="text-tb-secondary hover:text-white transition-colors bg-transparent border-0 cursor-pointer p-0">
            Khám phá
          </button>
          <ChevronRight size={12} />
          {detail.brand?.name && (
            <>
              <span className="text-tb-secondary">{detail.brand.name}</span>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-white truncate max-w-[320px]">{detail.name}</span>
        </div>

        {/* Two-column grid */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-start">

          {/* Col 1 — Gallery */}
          <div>
            <div className="relative aspect-square bg-canvas-elevated rounded-[20px] border border-bdr overflow-hidden">
              <img
                src={gallery[activeImg]}
                alt={detail.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
              />
            </div>
            <div className="flex gap-2.5 mt-3.5">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    'w-[84px] h-[84px] rounded-xl bg-canvas-elevated border flex-none overflow-hidden cursor-pointer transition-all',
                    activeImg === i
                      ? 'border-amber-400/60 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'
                      : 'border-tb-border',
                  )}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Col 2 — Info */}
          <div className="flex flex-col gap-[22px]">

            {/* Brand · condition meta */}
            <div className="flex items-center gap-2 font-body text-[13px] text-tb-secondary">
              {detail.brand?.name && <span>{detail.brand.name}</span>}
              {detail.brand?.name && detail.category?.name && <span className="text-tb-muted">·</span>}
              {detail.category?.name && <span>{detail.category.name}</span>}
            </div>

            {/* Title */}
            <h1 className="m-0 font-display font-black text-[40px] tracking-[-0.02em] leading-[1.1] text-white">
              {detail.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-[18px] font-body text-[13px] text-tb-secondary">
              <span>
                <span className="text-tb-amber font-bold">★ 4.9</span>
                {' · 1.2k đánh giá'}
              </span>
              <span className="text-tb-muted">·</span>
              <span>🔥 Đã thích</span>
            </div>

            {/* Price */}
            <PriceText price={effectivePrice} size="lg" />

            {/* SKU badge */}
            {detail.sku && (
              <div>
                <Badge variant="outline" className="bg-canvas-elevated text-ink-muted border-bdr font-mono text-xs">
                  SKU: {detail.sku}
                </Badge>
              </div>
            )}

            {/* Variant selector */}
            {hasVariants && (detail.variations ?? []).map((variation, tierIdx) => (
              <div key={tierIdx} className="flex flex-col gap-2">
                <span className="font-body font-semibold text-sm text-ink-pri">{variation.name}</span>
                <div className="flex flex-wrap gap-2">
                  {variation.options.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectTier(tierIdx, optIdx)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg border text-sm font-body transition-colors cursor-pointer',
                        selectedTiers[tierIdx] === optIdx
                          ? 'border-accent-amber text-accent-amber bg-accent-amber/10'
                          : 'border-bdr bg-canvas-elevated text-ink-pri hover:border-accent-amber/50',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Inventory */}
            {available !== null && (
              <div className={cn(
                'rounded-lg px-3.5 py-2.5 text-sm font-medium',
                isLowStock
                  ? 'bg-accent-amber/10 border border-accent-amber text-accent-amber'
                  : 'bg-accent-green/10 border border-accent-green text-accent-green',
              )}>
                {available > 0
                  ? `Còn ${available} sản phẩm${isLowStock ? ' (sắp hết)' : ''}`
                  : 'Hết hàng'}
              </div>
            )}

            {/* Qty row */}
            {available !== 0 && (
              <div className="flex items-center justify-between py-4 border-y border-bdr">
                <span className="font-body font-semibold text-sm text-white">Số lượng</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri text-lg flex items-center justify-center cursor-pointer hover:border-accent-amber transition-colors">
                    −
                  </button>
                  <span className="font-mono text-lg font-bold min-w-[24px] text-center text-ink-pri">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    className="w-9 h-9 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri text-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-accent-amber">
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Variant error */}
            {variantError && (
              <p className="m-0 text-sm text-accent-red">{variantError}</p>
            )}

            {/* CTAs */}
            <div className="flex gap-3">
              {available === 0 || skuOutOfStock ? (
                <button disabled className="flex-1 h-14 text-base font-semibold text-ink-muted bg-canvas-elevated border border-bdr rounded-xl cursor-not-allowed opacity-60">
                  Hết hàng
                </button>
              ) : (
                <GradientButton
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending || !allTiersSelected}
                  className={cn('flex-1 h-14 text-base', inCart && 'opacity-90')}>
                  <ShoppingCart size={16} />
                  {addToCart.isPending ? 'Đang thêm…' : !allTiersSelected ? 'Chọn phân loại' : inCart ? `THÊM VÀO GIỎ (+${quantity})` : 'THÊM VÀO GIỎ HÀNG'}
                </GradientButton>
              )}
              <button
                type="button"
                aria-label="Yêu thích"
                className="w-14 h-14 flex items-center justify-center rounded-xl border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber hover:text-accent-amber transition-colors cursor-pointer">
                <Heart size={20} />
              </button>
            </div>

            {/* Seller card */}
            <div className="flex items-center gap-[14px] p-[18px] bg-canvas-surface border border-bdr rounded-2xl">
              <Avatar alt={sellerName} size={48} />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="font-body font-semibold text-sm text-white truncate">{sellerName}</span>
                <span className="font-body text-xs text-tb-muted">4.9 ★ · 12.4k đã bán · Phản hồi trong 5 phút</span>
              </div>
              <button
                type="button"
                className="bg-canvas-elevated border border-bdr rounded-[10px] px-3 py-2 font-body font-semibold text-xs text-tb-secondary cursor-pointer hover:border-accent-amber hover:text-white transition-colors whitespace-nowrap">
                Theo dõi
              </button>
              <button
                type="button"
                className="bg-canvas-elevated border border-bdr rounded-[10px] px-3 py-2 font-body font-semibold text-xs text-tb-secondary cursor-pointer hover:border-accent-amber hover:text-white transition-colors whitespace-nowrap">
                Chat
              </button>
            </div>

            {/* Trust strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-bdr">
              {trustItems.map(({ Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-[10px] bg-amber-400/[0.10] text-tb-amber flex-none inline-flex items-center justify-center">
                    <Icon size={18} />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-body font-semibold text-[13px] text-white leading-tight">{label}</span>
                    <span className="font-body text-[11px] text-tb-muted">{sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description section */}
        <section className="mt-12 pt-8 border-t border-bdr">
          <h2 className="font-display font-black text-2xl tracking-[-0.01em] text-white m-0 mb-[18px]">
            Mô tả sản phẩm
          </h2>
          <p className="font-body text-[15px] leading-[1.7] text-tb-secondary m-0 max-w-[880px]">
            {detail.description ?? 'Hàng chính hãng nhập khẩu trực tiếp, nguyên seal chưa kích hoạt. Đầy đủ phụ kiện theo box. Bảo hành theo tiêu chuẩn nhà sản xuất. Giao hàng toàn quốc trong vòng 24 giờ.'}
          </p>
        </section>
      </div>
    </div>
  );
}
