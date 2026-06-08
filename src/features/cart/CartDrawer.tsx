import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from "@/hooks/useCart";
import { GradientButton } from "@/components/shared/GradientButton";
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, buildVariantLabel } from "@/lib/utils";
import { api } from "@/api";
import { queryKeys } from "@/hooks/queryKeys";
import type { ProductWithInventory } from "@/types";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
}: CartDrawerProps): ReactElement | null {
  const navigate = useNavigate();
  const { data: cart } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const items = cart?.items ?? [];
  const productIds = [...new Set(items.map((i) => i.productId))].sort(
    (a, b) => a - b,
  );

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.cartItems(productIds),
    queryFn: () => api.products.getMultipleWithInventory(productIds),
    enabled: productIds.length > 0,
  });

  const productMap = new Map<number, ProductWithInventory>();
  productsData?.forEach((p) => productMap.set(Number(p.id), p));

  const isMutating =
    updateItem.isPending || removeItem.isPending || clearCart.isPending;

  if (!isOpen) return null;

  function getEffectivePrice(item: (typeof items)[0]): number {
    const product = productMap.get(item.productId);
    if (item.skuId != null && product?.skus?.length) {
      const sku = product.skus.find((s) => Number(s.id) === item.skuId);
      if (sku) return Number(sku.price);
    }
    return Number(product?.price ?? 0);
  }

  const total = items.reduce(
    (sum, item) => sum + getEffectivePrice(item) * item.quantity,
    0,
  );

  function handleDecrement(itemId: number, quantity: number): void {
    if (quantity - 1 === 0) {
      removeItem.mutate(itemId);
    } else {
      updateItem.mutate({ itemId, quantity: quantity - 1 });
    }
  }

  function handleCheckout(): void {
    onClose();
    void navigate("/checkout");
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/70 z-[100]" />

      <div className="fixed top-0 right-0 w-[360px] max-w-full h-screen bg-canvas-surface border-l border-bdr z-[101] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-bdr flex items-center justify-between">
          <h2 className="m-0 font-display text-xl font-black uppercase tracking-wide text-ink-pri">
            Giỏ hàng
            <span className="ml-2 text-sm font-body font-normal text-ink-sec">
              ({items.length} sản phẩm)
            </span>
          </h2>
          <ModalCloseButton onClick={onClose} />
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="text-center py-16 px-5 text-ink-sec flex flex-col items-center gap-3">
              <div className="text-5xl">🛒</div>
              <p className="m-0 text-sm">Giỏ hàng trống</p>
            </div>
          ) : (
            items.map((item) => {
              const product = productMap.get(item.productId);
              const name =
                product?.name ??
                (productsLoading ? "" : "Sản phẩm không còn tồn tại");
              const imageUrl = product?.imageUrls?.[0] ?? product?.imageUrl ?? "";
              const variantLabel = buildVariantLabel(item.skuTierIdx, product?.variations);

              return (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-canvas-elevated border border-bdr rounded-xl"
                >
                  {productsLoading ? (
                    <Skeleton className="w-24 h-24 rounded-lg shrink-0" />
                  ) : (
                    <img
                      src={imageUrl}
                      alt={name}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0 border border-bdr"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {productsLoading ? (
                      <Skeleton className="h-4 w-3/4 mb-2" />
                    ) : (
                      <>
                        <p className="m-0 mb-0.5 font-semibold text-sm text-ink-pri truncate">
                          {name}
                        </p>
                        {variantLabel && (
                          <p className="m-0 mb-1 text-xs text-ink-muted truncate">
                            {variantLabel}
                          </p>
                        )}
                      </>
                    )}
                    <p className="m-0 mb-2 font-mono font-bold text-sm text-accent-amber">
                      {formatPrice(getEffectivePrice(item))}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => handleDecrement(item.id, item.quantity)}
                        className="size-7 grid place-items-center rounded-md border border-bdr bg-canvas-surface text-ink-pri transition-colors enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus size={13} className="shrink-0" />
                      </button>

                      <span className="font-mono text-sm font-bold min-w-[20px] text-center text-ink-pri">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() =>
                          updateItem.mutate({
                            itemId: item.id,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="size-7 grid place-items-center rounded-md border border-bdr bg-canvas-surface text-ink-pri transition-colors enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={13} className="shrink-0" />
                      </button>

                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => removeItem.mutate(item.id)}
                        className="ml-auto bg-transparent border-0 text-ink-sec transition-colors enabled:cursor-pointer enabled:hover:text-accent-red disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                      >
                        <Trash2 size={16} className="shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-bdr">
            <div className="flex justify-between items-center mb-4 text-base border-t border-bdr pt-3">
              <span className="font-semibold text-ink-pri">Tổng cộng</span>
              <span className="font-mono font-bold text-lg text-accent-amber">
                {formatPrice(total)}
              </span>
            </div>
            <GradientButton
              onClick={handleCheckout}
              disabled={isMutating}
              className="w-full py-3.5 text-base"
            >
              ĐẶT HÀNG NGAY →
            </GradientButton>
          </div>
        )}
      </div>
    </>
  );
}
