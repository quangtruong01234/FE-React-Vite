import { useState, type ReactElement } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Shield, RotateCcw, ShoppingCart, ChevronRight, Minus, Plus, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { useCart, useAddToCart } from '@/hooks/data/useCart';
import { queryKeys } from '@/hooks/query/queryKeys';
import { findCartLine } from '@/hooks/query/cartCache';
import { useAuthContext } from '@/context/useAuthContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/format/utils';
import { getValidSkus, findMatchingSku, getOptionStock, defaultTierSelection } from '@/lib/domain/sku';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { preloadImage } from '@/lib/http/preloadImage';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import { PriceText } from '@/components/shared/PriceText';
import { GradientButton } from '@/components/shared/GradientButton';
import { IconButton } from '@/components/shared/IconButton';
import { Avatar } from '@/components/shared/Avatar';
import { WishlistButton } from '@/components/shared/WishlistButton';
import { DemoModeGate } from '@/components/shared/DemoModeGate';
import { ProductReviews } from './ProductReviews';
import { ShopOtherProducts } from './ShopOtherProducts';
import { ProductQuestionBox } from './ProductQuestionBox';
import { sellerName } from './sellerName';
import { sellerProfilePath } from './sellerCard';
import { SellerFollowButton } from './SellerFollowButton';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { LANG_LOCALE } from '@/lib/i18n/lang';
import { productMessages } from './product.i18n';
import type { AddToCartDto } from '@/types';

const trustItems = [
  { Icon: Truck,     label: 'perkDelivery', sub: 'perkDeliverySub' },
  { Icon: Shield,    label: 'perkWarranty', sub: 'perkWarrantySub' },
  { Icon: RotateCcw, label: 'perkReturns',  sub: 'perkReturnsSub'  },
] as const;

const SELLER_IDENTITY_CLS = 'flex flex-1 min-w-0 items-center gap-3.5';
const SELLER_ACTION_CLS =
  'bg-canvas-elevated border border-bdr rounded-tb-input px-3 py-2 font-body font-semibold text-xs text-tb-secondary cursor-pointer hover:border-accent-amber hover:text-ink-pri transition-colors whitespace-nowrap';

export default function ProductDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = useT(productMessages);
  const { data: cart } = useCart();
  const addToCart = useAddToCart();

  const { currentUser } = useAuthContext();

  const { data: detail, isLoading: loading, error } = useQuery({
    queryKey: queryKeys.products.withInventory(id ?? ''),
    queryFn: () => api.products.getWithInventory(id ?? ''),
    enabled: !!id,
  });

  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedTiers, setSelectedTiers] = useState<Record<number, number>>(() =>
    defaultTierSelection(detail?.variations, detail?.skus),
  );
  const [variantError, setVariantError] = useState('');
  const [buyNowError, setBuyNowError] = useState('');

  // Re-derive the auto-selection whenever the route id or the product's
  // variation/SKU data changes (adjust-state-during-render, no effect cascade).
  const resetSelection = (): void => {
    setVariantError('');
    setBuyNowError('');
    setSelectedTiers(defaultTierSelection(detail?.variations, detail?.skus));
  };
  useResetOnChange(id, resetSelection);
  useResetOnChange(detail?.variations, resetSelection);
  useResetOnChange(detail?.skus, resetSelection);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas-base">
        <div className="bg-canvas-surface border-b border-bdr px-5 py-3">
          <Skeleton className="h-8 w-24 bg-canvas-elevated rounded-lg" />
        </div>
        <div className="max-w-[1080px] mx-auto px-8 pt-6 grid lg:grid-cols-[1.15fr_1fr] gap-12">
          <div className="flex flex-col gap-3">
            <Skeleton className="w-full aspect-square bg-canvas-elevated rounded-tb-sheet" />
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
      : t('notFound');
    return (
      <div className="min-h-screen bg-canvas-base flex flex-col items-center justify-center gap-3">
        <p className="text-ink-sec m-0">{msg}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors">
          {t('back')}
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
  const inCart     = cart?.items.find(i => i.productId === detail.id);
  const sellerLabel = sellerName(detail, lang);
  const sellerPath = sellerProfilePath(detail);
  const gallery: string[] = detail.imageUrls ?? [];

  const isOwner = !!currentUser && detail.userId === currentUser.id;
  const effectivePrice = (hasVariants && matchedSku) ? Number(matchedSku.price) : Number(detail.price);
  const skuOutOfStock = hasVariants && allTiersSelected && matchedSku != null && matchedSku.stockQuantity === 0;

  function handleSelectTier(tierIdx: number, optIdx: number): void {
    setSelectedTiers(prev => ({ ...prev, [tierIdx]: optIdx }));
    if (variantError) setVariantError('');
  }

  /** The line to add, or `null` after flagging an incomplete variant pick. */
  function cartLineDto(): AddToCartDto | null {
    if (!detail) return null;
    if (!hasVariants) return { productId: detail.id, quantity };
    if (!allTiersSelected) {
      setVariantError(t('pickAllVariants'));
      return null;
    }
    if (!matchedSku) {
      setVariantError(t('variantUnavailable'));
      return null;
    }
    return { productId: detail.id, quantity, skuId: Number(matchedSku.id) };
  }

  function handleAddToCart(): void {
    const dto = cartLineDto();
    if (dto) addToCart.mutate(dto);
  }

  // F9 — add the line, then check out only that line (CheckoutPage filters the
  // cart by `selectedIds`). The quantity merges into an existing line, as on Shopee.
  async function handleBuyNow(): Promise<void> {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    const dto = cartLineDto();
    if (!dto) return;
    setBuyNowError('');
    try {
      const line = findCartLine(await addToCart.mutateAsync(dto), dto);
      if (!line) {
        setBuyNowError(t('buyNowFailed'));
        return;
      }
      navigate('/checkout', { state: { selectedIds: [line.id] } });
    } catch (error: unknown) {
      setBuyNowError(error instanceof Error && error.message ? error.message : t('buyNowFailed'));
    }
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5">
          <ArrowLeft size={16} className="shrink-0" /> {t('back')}
        </button>
      </div>

      <div className="max-w-[1080px] mx-auto px-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 py-5 font-body text-xs text-tb-muted">
          <button
            onClick={() => navigate('/')}
            className="text-tb-secondary hover:text-ink-pri transition-colors bg-transparent border-0 cursor-pointer p-0">
            {t('explore')}
          </button>
          <ChevronRight size={12} className="shrink-0" />
          {detail.brand?.name && (
            <>
              <span className="text-tb-secondary">{detail.brand.name}</span>
              <ChevronRight size={12} className="shrink-0" />
            </>
          )}
          <span className="text-ink-pri truncate max-w-[320px]">{detail.name}</span>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-start">

          {/* Col 1 — Gallery */}
          <div>
            <div className="relative aspect-square bg-canvas-elevated rounded-tb-sheet border border-bdr overflow-hidden">
              {gallery.length > 0 ? (
                <img
                  src={cldImage(gallery[activeImg], 1200)}
                  alt={detail.name}
                  className="w-full h-full object-cover"
                  fetchPriority="high"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-ink-muted text-sm font-body">
                  {t('noImage')}
                </div>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2.5 mt-3.5 overflow-x-auto">
                {gallery.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    aria-label={t('viewImage', { n: i + 1 })}
                    aria-pressed={activeImg === i}
                    // The hero requests a wider derivative than the thumb, so
                    // warm it on hover instead of on click.
                    onMouseEnter={() => preloadImage(cldImage(src, 1200))}
                    className={cn(
                      'w-[84px] h-[84px] rounded-xl bg-canvas-elevated border flex-none overflow-hidden cursor-pointer transition-all',
                      activeImg === i
                        ? 'border-tb-amber/60 ring-[3px] ring-accent-amber/15'
                        : 'border-tb-border',
                    )}
                  >
                    <img src={cldImage(src, 200)} alt="" className="w-full h-full object-cover" loading="lazy" />
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
            <h1 className="m-0 font-display font-black text-[40px] tracking-[-0.02em] leading-[1.1] text-ink-pri">
              {detail.name}
            </h1>

            {/* Rating */}
            {(detail.rating > 0 || detail.ratingCount > 0 || detail.likesCount > 0) && (
              <div className="flex items-center gap-[18px] font-body text-[13px] text-tb-secondary">
                {detail.rating > 0 && (
                  <span>
                    <span className="text-tb-amber font-bold">★ {Number(detail.rating).toFixed(1)}</span>
                    {detail.ratingCount > 0 && t('ratingCount', { count: detail.ratingCount, n: Number(detail.ratingCount).toLocaleString(LANG_LOCALE[lang]) })}
                  </span>
                )}
                {detail.rating > 0 && detail.likesCount > 0 && <span className="text-tb-muted">·</span>}
                {detail.likesCount > 0 && <span>{t('likeCount', { count: detail.likesCount, n: Number(detail.likesCount).toLocaleString(LANG_LOCALE[lang]) })}</span>}
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
                              ? 'border-accent-amber text-accent-amber bg-tb-amber/10 cursor-pointer'
                              : 'border-bdr bg-canvas-elevated text-ink-pri hover:border-tb-amber/50 cursor-pointer',
                        )}
                      >
                        <span>{opt}</span>
                        {stock !== null && (
                          <span className="font-body text-[10px] mt-0.5 text-ink-muted leading-none">
                            {stock === 0 ? t('optionSoldOut') : t('optionLeft', { count: stock })}
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
              <p className="m-0 rounded-lg px-3.5 py-2.5 text-sm font-medium bg-tb-amber/10 border border-accent-amber text-accent-amber">
                {t('variantsUpdating')}
              </p>
            )}

            {/* Inventory */}
            {available !== null && (
              <div className={cn(
                'rounded-lg px-3.5 py-2.5 text-sm font-medium',
                isLowStock
                  ? 'bg-tb-amber/10 border border-accent-amber text-accent-amber'
                  : 'bg-tb-green/10 border border-accent-green text-accent-green',
              )}>
                {available > 0
                  ? `${t('inStock', { count: available })}${isLowStock ? t('lowStock') : ''}`
                  : t('outOfStock')}
              </div>
            )}

            {/* Qty row */}
            {available !== 0 && (
              <div className="flex items-center justify-between py-4 border-y border-bdr">
                <span className="font-body font-semibold text-sm text-ink-pri">{t('quantity')}</span>
                <div className="flex items-center gap-1.5">
                  <IconButton
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    aria-label={t('decreaseQty')}
                    className="size-9 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-accent-amber">
                    <Minus size={16} className="shrink-0" />
                  </IconButton>
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
                  <IconButton
                    onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    aria-label={t('increaseQty')}
                    className="size-9 rounded-lg border border-bdr bg-canvas-elevated text-ink-pri transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-accent-amber">
                    <Plus size={16} className="shrink-0" />
                  </IconButton>
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
                  {t('outOfStock')}
                </button>
              ) : (
                <DemoModeGate className="flex-1">
                  <GradientButton
                    onClick={handleAddToCart}
                    disabled={addToCart.isPending || !allTiersSelected || (hasVariants && !matchedSku)}
                    className={cn('flex-1 h-14 text-base', inCart && 'opacity-90')}>
                    <ShoppingCart size={16} className="shrink-0" />
                    {addToCart.isPending ? t('adding') : !allTiersSelected ? t('pickVariant') : inCart ? t('addMore', { count: quantity }) : t('addToCart')}
                  </GradientButton>
                </DemoModeGate>
              )}
              <WishlistButton
                productId={detail.id}
                iconSize={20}
                className="size-14 rounded-xl border border-bdr bg-canvas-elevated hover:border-accent-amber"
              />
            </div>
            {available !== 0 && !skuOutOfStock && (
              <DemoModeGate>
                <button
                  type="button"
                  onClick={() => void handleBuyNow()}
                  disabled={addToCart.isPending || !allTiersSelected || (hasVariants && !matchedSku)}
                  className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-accent-amber bg-tb-amber/10 font-display font-black uppercase tracking-widest text-sm text-accent-amber cursor-pointer hover:bg-tb-amber/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Zap size={16} className="shrink-0" />
                  {addToCart.isPending ? t('buyingNow') : t('buyNow')}
                </button>
              </DemoModeGate>
            )}
            {buyNowError && (
              <p role="alert" className="m-0 text-sm text-accent-red">{buyNowError}</p>
            )}
            {hasVariants && !allTiersSelected && (
              <p className="m-0 text-sm text-ink-sec">{t('pickAllVariantsHint')}</p>
            )}
            </div>

            {/* Seller card + trust strip — hidden when viewing own product */}
            {!isOwner && (
              <>
                <div className="flex items-center gap-3.5 p-[18px] bg-canvas-surface border border-bdr rounded-2xl">
                  {sellerPath ? (
                    <Link to={sellerPath} className={cn(SELLER_IDENTITY_CLS, 'group')}>
                      <Avatar src={detail.user?.avatar} alt={sellerLabel} size={48} />
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="font-body font-semibold text-sm text-ink-pri truncate group-hover:text-accent-amber transition-colors">{sellerLabel}</span>
                        <span className="font-body text-xs text-tb-muted">{t('viewShop')}</span>
                      </div>
                    </Link>
                  ) : (
                    <div className={SELLER_IDENTITY_CLS}>
                      <Avatar alt={sellerLabel} size={48} />
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="font-body font-semibold text-sm text-ink-pri truncate">{sellerLabel}</span>
                        <span className="font-body text-xs text-tb-muted">{t('seller')}</span>
                      </div>
                    </div>
                  )}
                  <SellerFollowButton
                    sellerId={detail.userId}
                    sellerExists={sellerPath !== null}
                    className={SELLER_ACTION_CLS}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      currentUser
                        ? navigate('/messages', { state: { otherUserId: detail.userId } })
                        : navigate('/login')
                    }
                    className={SELLER_ACTION_CLS}>
                    Chat
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-bdr">
                  {trustItems.map(({ Icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-tb-input bg-tb-amber/[0.10] text-tb-amber flex-none inline-flex items-center justify-center">
                        <Icon size={18} />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-body font-semibold text-[13px] text-ink-pri leading-tight">{t(label)}</span>
                        <span className="font-body text-[11px] text-tb-muted">{t(sub)}</span>
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
            <h2 className="font-display font-black text-2xl tracking-[-0.01em] text-ink-pri m-0 mb-[18px]">
              {t('description')}
            </h2>
            <div
              className="font-body text-[15px] leading-[1.7] text-tb-secondary max-w-[880px] prose-tb"
              dangerouslySetInnerHTML={{ __html: detail.description }}
            />
          </section>
        )}

        <ProductQuestionBox key={detail.id} productId={detail.id} signedIn={!!currentUser} />

        {!isOwner && (
          <ShopOtherProducts sellerId={detail.userId} currentProductId={detail.id} sellerPath={sellerPath} />
        )}

        <ProductReviews productId={detail.id} />
      </div>
    </div>
  );
}
