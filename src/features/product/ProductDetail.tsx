import { useState, useEffect, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Shield, RotateCcw, Heart, ShoppingCart, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useCart, useAddToCart } from '@/hooks/useCart';
import { queryKeys } from '@/hooks/queryKeys';
import { useAuthContext } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getValidSkus, findMatchingSku, getOptionStock } from '@/lib/sku';
import { PriceText } from '@/components/shared/PriceText';
import { GradientButton } from '@/components/shared/GradientButton';
import { Avatar } from '@/components/shared/Avatar';
import { ProductReviews } from './ProductReviews';

const trustItems = [
  { Icon: Truck,     label: 'Giao 24h',          sub: 'Toàn quốc'  },
  { Icon: Shield,    label: 'Bảo hành 12 tháng', sub: 'Chính hãng' },
  { Icon: RotateCcw, label: 'Đổi trả 7 ngày',    sub: 'Miễn phí'   },
];

export default function ProductDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cart } = useCart();
  const addToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedTiers, setSelectedTiers] = useState<Record<number, number>>({});
  const [variantError, setVariantError] = useState('');

  const { currentUser } = useAuthContext();

  const { data: detail, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.products.withInventory(Number(id)),
    queryFn: () => api.products.getWithInventory(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    setVariantError('');
    const variations = detail?.variations ?? [];
    if (!variations.length) {
      setSelectedTiers({});
      return;
    }
    // Auto-select the first in-stock option per tier, considering only valid SKUs.
    // Malformed products (no valid SKU) start with nothing selected.
    const valid = getValidSkus(detail?.skus, variations.length);
    const defaults: Record<number, number> = {};
    variations.forEach((variation, tier) => {
      const firstAvailable = variation.options.findIndex((_, optIdx) =>
        valid.some((s) => s.tierIdx[tier] === optIdx && s.stockQuantity > 0),
      );
      if (firstAvailable >= 0) defaults[tier] = firstAvailable;
    });
    setSelectedTiers(defaults);
  }, [id, detail?.variations, detail?.skus]);
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
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors">
          Quay lại
        </button>
      </div>
    );
  }

  const inventory  = detail.inventory;
  const variationCount = detail.variations?.length ?? 0;
  const hasVariants = variationCount > 0;
  const validSkus = getValidSkus(detail.skus, variationCount);
  const hasUsableVariants = hasVariants && validSkus.length > 0;
  const allTiersSelected = !hasVariants ||
    (detail.variations ?? []).every((_, i) => selectedTiers[i] !== undefined);
  const matchedSku = hasVariants
    ? findMatchingSku(validSkus, selectedTiers, variationCount)
    : undefined;
  // Variation products derive stock from the matched SKU; simple products use
  // product-level inventory. This keeps availability and add-to-cart in sync.
  const available  = hasVariants
    ? (matchedSku ? matchedSku.stockQuantity : null)
    : (inventory?.availableStock ?? null);
  const isLowStock = hasVariants ? false : (inventory?.isLowStock ?? false);
  const maxQty = available != null ? Math.min(available, 99) : 99;
  const inCart     = cart?.items.find(i => i.productId === Number(detail.id));
  const sellerName = detail.brand?.name ?? detail.user?.name ?? 'Shop Official';
  const gallery: string[] = (detail.imageUrls?.length ?? 0) > 0
    ? (detail.imageUrls as string[])
    : detail.imageUrl
      ? [detail.imageUrl]
      : [];

  const isOwner = !!currentUser && Number(detail.userId) === currentUser.id;
  const effectivePrice = (hasVariants && matchedSku) ? Number(matchedSku.price) : Number(detail.price);
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
      addToCart.mutate({ productId: Number(detail.id), quantity, skuId: Number(matchedSku.id) });
    } else {
      addToCart.mutate({ productId: Number(detail.id), quantity });
    }
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
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
              {gallery.length > 0 ? (
                <img
                  src={gallery[activeImg]}
                  alt={detail.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-ink-muted text-sm font-body">
                  Chưa có ảnh
                </div>
              )}
            </div>
            {gallery.length > 1 && (
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
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
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
            {(detail.rating > 0 || detail.ratingCount > 0 || detail.likesCount > 0) && (
              <div className="flex items-center gap-[18px] font-body text-[13px] text-tb-secondary">
                {detail.rating > 0 && (
                  <span>
                    <span className="text-tb-amber font-bold">★ {Number(detail.rating).toFixed(1)}</span>
                    {detail.ratingCount > 0 && ` · ${Number(detail.ratingCount).toLocaleString('vi-VN')} đánh giá`}
                  </span>
                )}
                {detail.rating > 0 && detail.likesCount > 0 && <span className="text-tb-muted">·</span>}
                {detail.likesCount > 0 && <span>🔥 {Number(detail.likesCount).toLocaleString('vi-VN')} lượt thích</span>}
              </div>
            )}

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
                  {variation.options.map((opt, optIdx) => {
                    const stock = getOptionStock(validSkus, tierIdx, optIdx, selectedTiers);
                    const unavailable = stock === null || stock === 0;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={unavailable}
                        onClick={() => !unavailable && handleSelectTier(tierIdx, optIdx)}
                        className={cn(
                          'flex flex-col items-center px-3.5 py-2 rounded-lg border text-sm font-body transition-colors',
                          unavailable
                            ? 'border-bdr bg-canvas-elevated text-ink-muted opacity-50 cursor-not-allowed'
                            : selectedTiers[tierIdx] === optIdx
                              ? 'border-accent-amber text-accent-amber bg-accent-amber/10 cursor-pointer'
                              : 'border-bdr bg-canvas-elevated text-ink-pri hover:border-accent-amber/50 cursor-pointer',
                        )}
                      >
                        <span>{opt}</span>
                        {stock !== null && (
                          <span className="font-body text-[10px] mt-0.5 text-ink-muted leading-none">
                            {stock === 0 ? 'Hết' : `còn ${stock}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Malformed variation data — no valid SKU to add */}
            {hasVariants && !hasUsableVariants && (
              <p className="m-0 rounded-lg px-3.5 py-2.5 text-sm font-medium bg-accent-amber/10 border border-accent-amber text-accent-amber">
                Phân loại sản phẩm đang được cập nhật. Vui lòng quay lại sau.
              </p>
            )}

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
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri text-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-accent-amber">
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={e => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) setQuantity(Math.min(maxQty, Math.max(1, v)));
                    }}
                    onBlur={e => {
                      const v = parseInt(e.target.value, 10);
                      setQuantity(isNaN(v) || v < 1 ? 1 : Math.min(maxQty, v));
                    }}
                    className="w-14 h-9 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri font-mono text-base font-bold text-center focus:outline-none focus:border-accent-amber transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
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
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
              {available === 0 || skuOutOfStock ? (
                <button disabled className="flex-1 h-14 text-base font-semibold text-ink-muted bg-canvas-elevated border border-bdr rounded-xl cursor-not-allowed opacity-60">
                  Hết hàng
                </button>
              ) : (
                <GradientButton
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending || !allTiersSelected || (hasVariants && !matchedSku)}
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
            {hasVariants && !allTiersSelected && (
              <p className="m-0 text-sm text-ink-sec">Vui lòng chọn đầy đủ phân loại</p>
            )}
            </div>

            {/* Seller card + trust strip — hidden when viewing own product */}
            {!isOwner && (
              <>
                <div className="flex items-center gap-[14px] p-[18px] bg-canvas-surface border border-bdr rounded-2xl">
                  <Avatar alt={sellerName} size={48} />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="font-body font-semibold text-sm text-white truncate">{sellerName}</span>
                    <span className="font-body text-xs text-tb-muted">Người bán</span>
                  </div>
                  <button
                    type="button"
                    className="bg-canvas-elevated border border-bdr rounded-[10px] px-3 py-2 font-body font-semibold text-xs text-tb-secondary cursor-pointer hover:border-accent-amber hover:text-white transition-colors whitespace-nowrap">
                    Theo dõi
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      currentUser
                        ? navigate('/messages', { state: { otherUserId: Number(detail.userId) } })
                        : navigate('/login')
                    }
                    className="bg-canvas-elevated border border-bdr rounded-[10px] px-3 py-2 font-body font-semibold text-xs text-tb-secondary cursor-pointer hover:border-accent-amber hover:text-white transition-colors whitespace-nowrap">
                    Chat
                  </button>
                </div>

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
              </>
            )}
          </div>
        </div>

        {/* Description section */}
        {detail.description?.trim() && (
          <section className="mt-12 pt-8 border-t border-bdr">
            <h2 className="font-display font-black text-2xl tracking-[-0.01em] text-white m-0 mb-[18px]">
              Mô tả sản phẩm
            </h2>
            <div
              className="font-body text-[15px] leading-[1.7] text-tb-secondary max-w-[880px] prose-tb"
              dangerouslySetInnerHTML={{ __html: detail.description }}
            />
          </section>
        )}

        <ProductReviews productId={detail.id} />
      </div>
    </div>
  );
}
