import { useState, useEffect, useRef, type ReactElement } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Wallet,
  ChevronRight,
  CheckCircle,
  ShoppingCart,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkoutSchema,
  buildShippingAddress,
  ADDRESS_FIELDS,
  type CheckoutFormData,
} from "./checkout.schema";
import { usePaymentOptions } from "./usePaymentOptions";
import { setPendingCheckout } from "./pendingCheckout";
import { buildCheckoutSignature, resolveIdempotencyKey } from "./idempotency";
import { effectiveUnitPrice, buildShippingFeeItems } from "./shippingFee";
import { resolvePaymentUrl } from "@/lib/paymentUrl";
import { api } from "@/api";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from "@/hooks/useCart";
import type { CreateOrderDto, PaymentMethod, ProductWithInventory } from "@/types";
import { formatVnd, cn, buildVariantLabel } from "@/lib/utils";
import { GradientButton } from "@/components/shared/GradientButton";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/hooks/queryKeys";

const PAYMENT_ICON: Record<string, typeof Banknote> = {
  cod: Banknote,
  zalopay: Wallet,
  vnpay: CreditCard,
};

export default function CheckoutPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedIds = new Set<number>((location.state as { selectedIds?: number[] } | null)?.selectedIds ?? []);

  const { options: paymentOptions, isLoading: paymentLoading } =
    usePaymentOptions();
  const {
    data: serverCart,
    isLoading: cartLoading,
    error: cartError,
  } = useCart();
  const updateItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const [stockError, setStockError] = useState<Record<number, string>>({});
  const [successOrderIds, setSuccessOrderIds] = useState<number[] | null>(null);
  const queryClient = useQueryClient();

  const allItems = serverCart?.items ?? [];
  const items = selectedIds.size > 0 ? allItems.filter(i => selectedIds.has(i.id)) : allItems;
  const productIds = [...new Set(items.map((i) => i.productId))].sort((a, b) => a - b);

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: queryKeys.products.cartItems(productIds),
    queryFn: () => api.products.getMultipleWithInventory(productIds),
    enabled: productIds.length > 0,
  });

  const productMap = new Map<number, ProductWithInventory>();
  productsData?.forEach((p) => productMap.set(Number(p.id), p));

  function getEffectivePrice(item: (typeof items)[0]): number {
    return effectiveUnitPrice(item, productMap.get(item.productId));
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + getEffectivePrice(item) * item.quantity,
    0,
  );
  const isMutating = updateItem.isPending || removeCartItem.isPending;

  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { paymentMethod: "cod" },
  });

  useEffect(() => {
    if (!successOrderIds) return;
    const timer = setTimeout(() => void navigate("/orders"), 3000);
    return () => clearTimeout(timer);
  }, [successOrderIds, navigate]);

  // P0-04: a stable key per checkout intent. Reused across retries (double-
  // submit / network hiccup) so the backend replays instead of duplicating;
  // regenerated automatically when the cart contents change.
  const idemKeyRef = useRef<{ signature: string; key: string } | null>(null);

  const { mutateAsync: placeOrder, isPending: mutationPending } = useMutation({
    mutationFn: ({ dto, idempotencyKey }: { dto: CreateOrderDto; idempotencyKey: string }) =>
      api.orders.create(dto, idempotencyKey),
  });

  const loading = mutationPending || isSubmitting;

  // P1-C: best-effort GHN shipping-fee preview. GHN often rejects free-text
  // addresses (502) in this environment, so failure must degrade gracefully —
  // never block checkout.
  const {
    mutate: calcShipping,
    data: shippingResult,
    isPending: shippingPending,
    isError: shippingFailed,
    reset: resetShipping,
  } = useMutation({
    mutationFn: (shippingAddress: string) =>
      api.orders.getShippingFee({
        shippingAddress,
        items: buildShippingFeeItems(items, productMap),
      }),
  });

  const shippingFee = shippingResult?.shippingFee ?? 0;
  const grandTotal = totalPrice + shippingFee;

  // Recalculation needed whenever any address field changes.
  useEffect(() => {
    const sub = watch((_, { name }) => {
      if (name && (ADDRESS_FIELDS as readonly string[]).includes(name)) {
        resetShipping();
      }
    });
    return () => sub.unsubscribe();
  }, [watch, resetShipping]);

  function handleCalcShipping(): void {
    const data = getValues();
    const missing = ADDRESS_FIELDS.some((f) => !String(data[f] ?? "").trim());
    if (missing) {
      setError("root", {
        message: "Vui lòng nhập đầy đủ địa chỉ giao hàng trước khi tính phí.",
      });
      return;
    }
    clearErrors("root");
    calcShipping(buildShippingAddress(data));
  }

  async function removeOrderedItemsFromCart(): Promise<void> {
    try {
      if (selectedIds.size > 0 && items.length < allItems.length) {
        await Promise.all(items.map((item) => removeCartItem.mutateAsync(item.id)));
      } else {
        await clearCart.mutateAsync();
      }
    } catch {
      // best-effort — orders are already placed, backend cart stays recoverable
    }
  }

  async function onSubmit(data: CheckoutFormData): Promise<void> {
    setStockError({});

    try {
      const productIds = items.map((item) => item.productId);
      const stockData = await api.products.getMultipleWithInventory(productIds);
      const productStockMap = new Map<number, ProductWithInventory>();
      for (const p of stockData) productStockMap.set(Number(p.id), p);

      const newStockError: Record<number, string> = {};
      for (const item of items) {
        const p = productStockMap.get(item.productId);
        let avail = 0;
        if (item.skuId != null && p?.skus?.length) {
          const sku = p.skus.find((s) => Number(s.id) === item.skuId);
          avail = sku?.stockQuantity ?? 0;
        } else {
          avail = p?.inventory?.availableStock ?? 0;
        }
        if (item.quantity > avail) {
          newStockError[item.productId] = `Chỉ còn ${avail} sản phẩm`;
        }
      }
      if (Object.keys(newStockError).length > 0) {
        setStockError(newStockError);
        return;
      }
    } catch {
      // skip stock check on error — backend will validate
    }

    try {
      const orderItems = items.map((item) => {
        const p = productMap.get(item.productId);
        return {
          productId: item.productId,
          productName: p?.name ?? '',
          quantity: item.quantity,
          ...(item.skuId != null ? { skuId: item.skuId } : {}),
        };
      });
      idemKeyRef.current = resolveIdempotencyKey(
        idemKeyRef.current,
        buildCheckoutSignature(orderItems),
        () => crypto.randomUUID(),
      );
      const result = await placeOrder({
        dto: {
          paymentMethod: data.paymentMethod,
          shippingAddress: buildShippingAddress(data),
          items: orderItems,
        },
        idempotencyKey: idemKeyRef.current.key,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      // Multi-seller checkout returns { orders, paymentUrl } with one payment covering all orders
      const isMultiSeller = "orders" in result;
      const orders = isMultiSeller ? result.orders : [result];
      if (data.paymentMethod === 'cod') {
        // COD has no gateway step — safe to clear the ordered items immediately.
        void removeOrderedItemsFromCart();
        setSuccessOrderIds(orders.map((o) => o.id));
      } else {
        const isPartial = selectedIds.size > 0 && items.length < allItems.length;
        try {
          // Single-order: poll payment-url — the gateway generates it
          // asynchronously, so it can briefly be null right after create.
          const paymentUrl = isMultiSeller
            ? result.paymentUrl
            : (await resolvePaymentUrl(() => api.orders.getPaymentUrl(result.id))).orderUrl;
          if (!paymentUrl) throw new Error('Không nhận được đường dẫn thanh toán.');
          // P0-04: do NOT clear the cart here. Record what this checkout covered
          // so PaymentResultPage can remove exactly those items once the gateway
          // confirms success — a cancelled/failed payment leaves the cart intact.
          setPendingCheckout({
            orderIds: orders.map((o) => o.id),
            cartItemIds: isPartial ? items.map((i) => i.id) : [],
            clearAll: !isPartial,
          });
          window.location.href = paymentUrl;
        } catch {
          // The order(s) already exist. Re-submitting would create duplicates,
          // so route the user to the created order to retry payment on the SAME
          // order (OrderDetailPage exposes a "Thanh toán ngay" action).
          if (isMultiSeller || orders.length > 1) {
            void navigate("/orders");
          } else {
            void navigate(`/order/${orders[0].id}`);
          }
        }
      }
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Đặt hàng thất bại. Vui lòng thử lại.";
      setError("root", { message: msg });
    }
  }

  function renderAddressField(
    name: (typeof ADDRESS_FIELDS)[number],
    label: string,
    placeholder: string,
    autoComplete: string,
  ): ReactElement {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={name}
          className="font-body font-[500] text-[11px] leading-[1.4] text-ink-sec tracking-[0.04em] uppercase"
        >
          {label}
        </label>
        <input
          id={name}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "h-[44px] bg-canvas-base border rounded-[10px] px-[14px] text-ink-pri font-body text-[14px] outline-none placeholder:text-ink-muted transition-[border-color,box-shadow] duration-[120ms]",
            "focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]",
            errors[name]
              ? "border-accent-red focus:border-accent-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]"
              : "border-bdr",
          )}
          {...register(name)}
        />
        {errors[name] && (
          <span className="text-xs text-accent-red">{errors[name]?.message}</span>
        )}
      </div>
    );
  }

  if (successOrderIds) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center">
        <div className="bg-canvas-surface border border-bdr rounded-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-5 text-center">
          <CheckCircle size={56} className="text-accent-green" />
          <div>
            <h2 className="font-display font-black text-2xl text-white m-0 mb-1">
              Đặt hàng thành công!
            </h2>
            <p className="font-body text-sm text-ink-sec m-0">
              Mã đơn hàng:{" "}
              <span className="font-mono text-accent-amber">
                {successOrderIds.map((id) => `#${id}`).join(", ")}
              </span>
            </p>
          </div>
          <p className="font-body text-xs text-ink-muted m-0">
            Tự động chuyển trang sau 3 giây...
          </p>
          <GradientButton
            onClick={() => void navigate("/orders")}
            className="w-full py-3"
          >
            Xem đơn hàng →
          </GradientButton>
        </div>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-canvas-base">
        <div className="max-w-[1080px] mx-auto px-6 py-12 flex flex-col gap-4">
          <Skeleton className="h-8 w-48 bg-canvas-elevated" />
          <Skeleton className="h-[200px] rounded-xl bg-canvas-elevated" />
          <Skeleton className="h-[120px] rounded-xl bg-canvas-elevated" />
        </div>
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-3 text-ink-sec">
          <p className="text-sm">Không thể tải giỏ hàng. Vui lòng thử lại.</p>
          <GradientButton
            onClick={() => void navigate(-1 as never)}
            className="py-2 px-6"
          >
            Quay lại
          </GradientButton>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-4">
          <ShoppingCart size={48} className="text-ink-muted" />
          <p className="text-ink-sec text-sm m-0">
            Giỏ hàng trống. Hãy thêm sản phẩm trước khi đặt hàng.
          </p>
          <GradientButton
            onClick={() => void navigate("/")}
            className="py-2 px-6"
          >
            Tiếp tục mua sắm
          </GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      {/* Header */}
      <div className="bg-canvas-surface border-b border-bdr px-4 sm:px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="bg-canvas-elevated border border-bdr rounded-lg px-3 py-2 text-ink-pri cursor-pointer text-sm hover:border-accent-amber transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 className="font-display text-xl font-black uppercase tracking-wide text-ink-pri m-0">
          Xác nhận đơn hàng
        </h1>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 pt-5 flex items-center gap-2 font-body text-xs text-ink-muted">
        <span>Giỏ hàng</span>
        <ChevronRight size={12} />
        <span className="text-accent-amber font-semibold">Thanh toán</span>
        <ChevronRight size={12} />
        <span>Hoàn tất</span>
      </div>

      {/* Two-column layout */}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          {/* LEFT — form */}
          <div className="flex flex-col gap-4">
            {errors.root?.message && (
              <div className="bg-red-950/30 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
                {errors.root.message}
              </div>
            )}

            {/* Address */}
            <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
              <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-white">
                1. Địa chỉ giao hàng
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {renderAddressField("fullName", "Họ tên người nhận", "Nguyễn Văn A", "name")}
                {renderAddressField("phone", "Số điện thoại", "0987654321", "tel")}
              </div>
              {renderAddressField("addressLine", "Số nhà, tên đường", "123 Nguyễn Huệ", "address-line1")}
              <div className="grid sm:grid-cols-3 gap-4">
                {renderAddressField("ward", "Phường/xã", "Phường Bến Nghé", "address-level3")}
                {renderAddressField("district", "Quận/huyện", "Quận 1", "address-level2")}
                {renderAddressField("province", "Tỉnh/thành phố", "TP. Hồ Chí Minh", "address-level1")}
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
              <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-white">
                2. Phương thức thanh toán
              </h2>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-[10px]">
                    {paymentLoading ? (
                      <>
                        <Skeleton className="h-[52px] rounded-tb-cta bg-canvas-elevated" />
                        <Skeleton className="h-[52px] rounded-tb-cta bg-canvas-elevated" />
                        <Skeleton className="h-[52px] rounded-tb-cta bg-canvas-elevated" />
                      </>
                    ) : (
                      paymentOptions.map(({ id, name }) => {
                        const active = field.value === id;
                        const Icon = PAYMENT_ICON[id] ?? Banknote;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => field.onChange(id as PaymentMethod)}
                            className={cn(
                              "flex items-center gap-[14px] px-[18px] py-[14px] text-left rounded-tb-cta border w-full cursor-pointer",
                              active
                                ? "bg-amber-400/[0.08] border-amber-400/50"
                                : "bg-tb-elevated border-tb-border",
                            )}
                          >
                            <span
                              className={cn(
                                "w-5 h-5 rounded-full shrink-0 border-2 inline-flex items-center justify-center",
                                active ? "border-tb-amber" : "border-tb-muted",
                              )}
                            >
                              {active && (
                                <span className="w-[10px] h-[10px] rounded-full bg-tb-amber" />
                              )}
                            </span>
                            <Icon
                              size={18}
                              color={active ? "#F59E0B" : "#A1A1AA"}
                            />
                            <span className="flex-1 font-body font-semibold text-sm text-white">
                              {name}
                            </span>
                          </button>
                        );
                      })
                    )}
                    {errors.paymentMethod && (
                      <span className="text-xs text-accent-red">
                        {errors.paymentMethod.message}
                      </span>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Product list */}
            <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-bdr">
                <span className="font-display font-bold uppercase text-sm tracking-wide text-ink-sec">
                  3. Sản phẩm ({items.length})
                </span>
              </div>
              {productsError ? (
                <div className="px-4 py-6 text-center text-accent-red text-sm">
                  Không thể tải thông tin sản phẩm. Vui lòng thử lại.
                </div>
              ) : items.map((item) => {
                const product = productMap.get(item.productId);
                const name = product?.name ?? (productsLoading ? "" : "Sản phẩm không còn tồn tại");
                const imageUrl = product?.imageUrls?.[0] ?? product?.imageUrl ?? "";
                const variantLabel = buildVariantLabel(item.skuTierIdx, product?.variations);
                return (
                <div
                  key={item.id}
                  className={cn(
                    "px-4 py-3 border-b border-bdr last:border-b-0",
                    stockError[item.productId] && "bg-red-950/20",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {productsLoading ? (
                      <Skeleton className="w-14 h-14 rounded-[10px] shrink-0" />
                    ) : (
                      <ProductThumb
                        src={imageUrl}
                        alt={name}
                        className="w-14 h-14 rounded-[10px]"
                      />
                    )}
                    <div className="min-w-[120px] flex-1">
                      {productsLoading ? (
                        <Skeleton className="h-4 w-3/4 mb-1" />
                      ) : (
                        <div className="font-medium text-sm text-ink-pri truncate">
                          {name}
                        </div>
                      )}
                      {variantLabel ? (
                          <div className="text-xs text-ink-muted truncate">
                            {variantLabel}
                          </div>
                        ) : null}
                      <div className="text-xs mt-0.5 font-mono text-accent-amber">
                        {formatVnd(getEffectivePrice(item))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() =>
                          item.quantity === 1
                            ? removeCartItem.mutate(item.id)
                            : updateItem.mutate({
                                itemId: item.id,
                                quantity: item.quantity - 1,
                              })
                        }
                        className="w-7 h-7 rounded-md border border-bdr bg-canvas-elevated text-ink-pri flex items-center justify-center enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base"
                      >
                        −
                      </button>
                      <span className="font-mono text-sm font-bold text-ink-pri min-w-[20px] text-center">
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
                        className="w-7 h-7 rounded-md border border-bdr bg-canvas-elevated text-ink-pri flex items-center justify-center transition-colors text-base enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                      <span className="font-mono font-bold text-sm text-ink-pri ml-2 min-w-[80px] text-right">
                        {formatVnd(getEffectivePrice(item) * item.quantity)}
                      </span>
                    </div>
                  </div>
                  {stockError[item.productId] && (
                    <p className="text-xs text-accent-red mt-1.5 mb-0 ml-[68px]">
                      ⚠ {stockError[item.productId]}
                    </p>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* RIGHT — sticky summary */}
          <div className="lg:sticky lg:top-[88px] flex flex-col gap-4 w-full">
            <div className="bg-canvas-surface border border-bdr rounded-xl px-4 py-4">
              <div className="flex justify-between items-center mb-2 text-sm text-ink-sec">
                <span>Tạm tính</span>
                <span className="font-mono">{formatVnd(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm text-ink-sec gap-2">
                <span>Phí vận chuyển</span>
                {shippingPending ? (
                  <span className="text-ink-muted">Đang tính…</span>
                ) : shippingResult ? (
                  shippingFee === 0 ? (
                    <span className="text-accent-green font-medium">Miễn phí</span>
                  ) : (
                    <span className="font-mono">{formatVnd(shippingFee)}</span>
                  )
                ) : shippingFailed ? (
                  <span className="text-ink-muted">Tính khi giao hàng</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleCalcShipping}
                    className="text-accent-amber font-medium hover:underline cursor-pointer"
                  >
                    Tính phí
                  </button>
                )}
              </div>
              <div className="flex justify-between items-center mb-3 text-sm text-ink-sec">
                <span>Giảm giá</span>
                <span className="font-mono">−0 đ</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-bdr">
                <span className="font-semibold text-ink-pri">
                  Tổng thanh toán
                </span>
                <span className="font-mono font-black text-2xl text-accent-amber">
                  {formatVnd(grandTotal)}
                </span>
              </div>
            </div>

            <GradientButton
              type="submit"
              disabled={loading || productsError || Object.keys(stockError).length > 0}
              className="w-full py-4 text-lg font-bold rounded-xl"
            >
              {loading ? "Đang đặt hàng..." : "XÁC NHẬN ĐẶT HÀNG →"}
            </GradientButton>

            <p className="text-center font-body text-xs text-gray-500 leading-relaxed m-0">
              Bằng việc đặt hàng, bạn đồng ý với{" "}
              <span className="text-gray-400 underline cursor-pointer">
                Điều khoản sử dụng
              </span>{" "}
              và{" "}
              <span className="text-gray-400 underline cursor-pointer">
                Chính sách bảo mật
              </span>{" "}
              của TryBuy.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
