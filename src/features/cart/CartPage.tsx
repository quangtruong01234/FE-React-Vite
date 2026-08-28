import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from '@/hooks/data/useCart';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { formatPrice, buildVariantLabel, cn } from '@/lib/format/utils';
import { toApiError } from '@/lib/http/apiError';
import { GradientButton } from '@/components/shared/GradientButton';
import { ApiErrorState } from '@/components/shared/ApiErrorState';
import { IconButton } from '@/components/shared/IconButton';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProductWithInventory } from '@/types';
import { effectiveUnitPrice } from './shippingFee';
import { cartLineName } from './checkoutItems';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';

export default function CartPage(): ReactElement {
  const navigate = useNavigate();
  const { data: cart, isLoading: cartLoading, error: cartError, refetch: refetchCart } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const items = cart?.items ?? [];

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(items.map(i => i.id)),
  );

  // Select everything when a (different) cart arrives — adjust-state-during-render,
  // keyed on the cart id so refetches of the same cart keep the user's selection.
  useResetOnChange(cart?.id, () => {
    setSelectedIds(new Set(items.map(i => i.id)));
  });

  const productIds = [...new Set(items.map(i => i.productId))].sort();

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsFailed,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.products.cartItems(productIds),
    queryFn: () => api.products.getMultipleWithInventory(productIds),
    enabled: productIds.length > 0,
  });

  const productMap = new Map<string, ProductWithInventory>();
  productsData?.forEach(product => productMap.set(product.id, product));

  const isMutating = updateItem.isPending || removeItem.isPending || clearCart.isPending;
  const isLoading = cartLoading || productsLoading;
  // Only the cart request decides this: it is what "giỏ hàng trống" is a claim
  // about. A failed *product* lookup still leaves real rows to render — but it
  // must not borrow the "Sản phẩm không còn tồn tại" wording, which asserts a
  // deletion nobody verified (BATCH-FAIL-01). It gets its own notice instead.
  const loadError = toApiError(cartError);

  function getEffectivePrice(item: (typeof items)[0]): number {
    return effectiveUnitPrice(item, productMap.get(item.productId));
  }

  const selectedItems = items.filter(i => selectedIds.has(i.id));
  const allChecked = items.length > 0 && selectedIds.size === items.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < items.length;

  const subtotal = selectedItems.reduce((sum, item) => sum + getEffectivePrice(item) * item.quantity, 0);

  function toggleAll(): void {
    if (allChecked) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  }

  function toggleItem(id: number): void {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDecrement(itemId: number, quantity: number): void {
    if (quantity - 1 === 0) removeItem.mutate(itemId);
    else updateItem.mutate({ itemId, quantity: quantity - 1 });
  }

  function handleCheckout(): void {
    navigate('/checkout', { state: { selectedIds: [...selectedIds] } });
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Nav bar */}
      <div className="bg-canvas-surface border-b border-bdr px-5 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} className="shrink-0" /> Quay lại
        </button>
        <h1 className="m-0 font-display font-black text-lg uppercase tracking-wide text-ink-pri">
          Giỏ hàng
          {items.length > 0 && (
            <span className="ml-2 text-sm font-body font-normal text-ink-sec normal-case tracking-normal">
              ({items.length} sản phẩm)
            </span>
          )}
        </h1>
      </div>

      <div className="max-w-[1080px] mx-auto px-6 py-8">
        {isLoading ? (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-28 w-full rounded-xl bg-canvas-elevated" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl bg-canvas-elevated" />
          </div>
        ) : loadError ? (
          <ApiErrorState error={loadError} onRetry={() => { void refetchCart(); }} embedded />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 py-24 text-ink-sec">
            <ShoppingCart size={56} className="text-ink-muted shrink-0" />
            <p className="m-0 font-body text-base">Giỏ hàng trống</p>
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="bg-canvas-elevated border border-bdr rounded-lg px-4 py-2 text-sm text-ink-pri cursor-pointer hover:border-accent-amber transition-colors font-body"
            >
              Khám phá sản phẩm
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
            {/* Left — item list */}
            <div className="flex flex-col gap-3">
              {/* Select-all bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-canvas-surface border border-bdr rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-tb-amber cursor-pointer"
                  />
                  <span className="font-body text-sm text-ink-pri">
                    Chọn tất cả ({items.length})
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => {
                      selectedIds.forEach(id => removeItem.mutate(id));
                      setSelectedIds(new Set());
                    }}
                    className="font-body text-xs text-accent-red cursor-pointer hover:underline disabled:opacity-40 bg-transparent border-0"
                  >
                    Xóa đã chọn ({selectedIds.size})
                  </button>
                )}
              </div>

              {productsFailed && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-tb-red/10 border border-tb-red/30 rounded-xl">
                  <span className="font-body text-xs text-ink-sec">
                    Chưa tải được thông tin sản phẩm. Giỏ hàng của bạn vẫn còn nguyên.
                  </span>
                  <button
                    type="button"
                    onClick={() => void refetchProducts()}
                    className="font-body text-xs text-accent-amber cursor-pointer hover:underline bg-transparent border-0 shrink-0"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Items */}
              {items.map(item => {
                const product = productMap.get(item.productId);
                const name = cartLineName(product, productsFailed);
                const imageUrl = product?.imageUrls?.[0] ?? product?.imageUrl ?? '';
                const variantLabel = buildVariantLabel(item.skuTierIdx, product?.variations);
                const price = getEffectivePrice(item);
                const checked = selectedIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex gap-4 p-4 bg-canvas-surface border rounded-xl transition-colors',
                      checked ? 'border-accent-amber/40' : 'border-bdr',
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item.id)}
                        className="w-4 h-4 rounded accent-tb-amber cursor-pointer shrink-0"
                      />
                    </div>

                    {/* Image */}
                    <ProductThumb
                      src={imageUrl}
                      alt={name}
                      iconSize={24}
                      className="w-20 h-20 rounded-lg border border-bdr"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <p className="m-0 font-body font-semibold text-sm text-ink-pri truncate">{name}</p>
                      {variantLabel && (
                        <p className="m-0 font-body text-xs text-ink-muted">{variantLabel}</p>
                      )}
                      <p className="m-0 font-mono font-bold text-sm text-accent-amber">{formatPrice(price)}</p>
                    </div>

                    {/* Qty + delete */}
                    <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                      <IconButton
                        disabled={isMutating}
                        onClick={() => removeItem.mutate(item.id)}
                        aria-label={`Xóa ${name} khỏi giỏ hàng`}
                        className="size-7 rounded-md text-ink-muted hover:text-accent-red transition-colors"
                      >
                        <Trash2 size={14} className="shrink-0" />
                      </IconButton>

                      <div className="flex items-center gap-1.5">
                        <IconButton
                          disabled={isMutating || item.quantity <= 1}
                          onClick={() => handleDecrement(item.id, item.quantity)}
                          aria-label="Giảm số lượng"
                          className="size-7 rounded-md border border-bdr bg-canvas-elevated text-ink-pri transition-colors enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Minus size={13} className="shrink-0" />
                        </IconButton>
                        <span className="font-mono text-sm font-bold min-w-[24px] text-center text-ink-pri">
                          {item.quantity}
                        </span>
                        <IconButton
                          disabled={isMutating}
                          onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                          aria-label="Tăng số lượng"
                          className="size-7 rounded-md border border-bdr bg-canvas-elevated text-ink-pri transition-colors enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={13} className="shrink-0" />
                        </IconButton>
                      </div>

                      <p className="m-0 font-mono text-xs text-ink-sec">
                        {formatPrice(price * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right — order summary (sticky) */}
            <div className="lg:sticky lg:top-24 flex flex-col gap-4 bg-canvas-surface border border-bdr rounded-xl p-5">
              <h2 className="m-0 font-display font-black text-base uppercase tracking-wide text-ink-pri">
                Tóm tắt đơn hàng
              </h2>

              <div className="flex flex-col gap-2.5 text-sm font-body">
                <div className="flex justify-between text-ink-sec">
                  <span>Sản phẩm đã chọn</span>
                  <span className="text-ink-pri font-semibold">{selectedItems.length}</span>
                </div>
                <div className="flex justify-between text-ink-sec">
                  <span>Tạm tính</span>
                  <span className="font-mono text-ink-pri">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-sec">
                  <span>Phí vận chuyển</span>
                  <span className="text-accent-green font-semibold">Miễn phí</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-bdr">
                <span className="font-body font-semibold text-sm text-ink-pri">Tổng cộng</span>
                <span className="font-mono font-bold text-lg text-accent-amber">{formatPrice(subtotal)}</span>
              </div>

              <GradientButton
                onClick={handleCheckout}
                disabled={selectedIds.size === 0 || isMutating}
                className="w-full py-3 text-sm"
              >
                ĐẶT HÀNG ({selectedIds.size}) →
              </GradientButton>

              {selectedIds.size === 0 && (
                <p className="m-0 text-center font-body text-xs text-ink-muted">
                  Chọn ít nhất 1 sản phẩm để đặt hàng
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
