import { useState, useEffect, useRef, type ReactElement } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Wallet,
  ChevronRight,
  CheckCircle,
  ShoppingCart,
  X,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkoutSchema,
  type CheckoutFormData,
} from "./checkout.schema";
import { AddressBookPicker } from "@/features/address/AddressBookPicker";
import { buildGhnShippingAddress, ghnLocationIds } from "@/features/address/addressUtils";
import { usePaymentOptions } from "./usePaymentOptions";
import { setPendingCheckout } from "./pendingCheckout";
import {
  buildCheckoutSignature,
  isOrderOutcomeUnknown,
  resolveIdempotencyKey,
} from "./idempotency";
import { effectiveUnitPrice, buildShippingFeeItems } from "./shippingFee";
import { isGhnAddressRefusal, shippingFeeFailure } from "./shippingFeeError";
import { checkoutSubmitErrorMessage } from "./checkoutSubmitError";
import { buildOrderItems, findStockShortages } from "./checkoutItems";
import { canIncreaseCartLine } from "./cartQuantity";
import {
  normalizeVoucherCode,
  voucherValidateCodes,
  voucherCreateCodes,
  nextVoucherCodes,
  appliedVoucherRows,
  discountedGrandTotal,
  voucherErrorMessage,
} from "./voucher";
import {
  availableVouchersRequest,
  sortVoucherSuggestions,
  voucherIneligibleMessage,
  voucherScopeLabel,
  voucherSuggestionDiscount,
} from "./voucherSuggestions";
import { resolvePaymentUrl, redirectToPaymentGateway, paymentUrlErrorMessage } from "@/lib/domain/paymentUrl";
import { productCoverImage } from "@/lib/domain/productImage";
import { api } from "@/api";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from "@/hooks/data/useCart";
import type {
  Address,
  CreateOrderDto,
  PaymentMethod,
  ProductWithInventory,
  VoucherValidation,
} from "@/types";
import { formatVnd, cn, buildVariantLabel } from "@/lib/format/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { GradientButton } from "@/components/shared/GradientButton";
import { IconButton } from "@/components/shared/IconButton";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/hooks/query/queryKeys";
import { invalidateOrderViews } from "@/lib/query/orderInvalidation";
import { useLanguage } from "@/context/useLanguage";
import { useT } from "@/hooks/ui/useT";
import { translateIfKey } from "@/lib/i18n/messages";
import { checkoutMessages } from "./checkout.i18n";

const PAYMENT_ICON: Record<string, typeof Banknote> = {
  cod: Banknote,
  zalopay: Wallet,
  vnpay: CreditCard,
};

export default function CheckoutPage(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const t = useT(checkoutMessages);
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
  const [stockError, setStockError] = useState<Record<string, string>>({});
  const [successOrderIds, setSuccessOrderIds] = useState<string[] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const queryClient = useQueryClient();

  const allItems = serverCart?.items ?? [];
  const items = selectedIds.size > 0 ? allItems.filter(i => selectedIds.has(i.id)) : allItems;
  const productIds = [...new Set(items.map((i) => i.productId))].sort();

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: queryKeys.products.cartItems(productIds),
    queryFn: () => api.products.getMultipleWithInventory(productIds),
    enabled: productIds.length > 0,
  });

  const productMap = new Map<string, ProductWithInventory>();
  productsData?.forEach((product) => productMap.set(product.id, product));

  // Item payloads carry the product name, so anything priced against the basket
  // (shipping fee, voucher suggestions) has to wait for the product query.
  const productsReady = productIds.length === 0 || productsData != null;

  function getEffectivePrice(item: (typeof items)[0]): number {
    return effectiveUnitPrice(item, productMap.get(item.productId));
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + getEffectivePrice(item) * item.quantity,
    0,
  );
  const isMutating = updateItem.isPending || removeCartItem.isPending;

  const {
    handleSubmit,
    control,
    setError,
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
  // SWEEP-1002-01: the last create failed without telling us whether the order
  // exists. Re-placing is gated behind an explicit confirm that mints a new key.
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [confirmRetryOpen, setConfirmRetryOpen] = useState(false);

  const { mutateAsync: placeOrder, isPending: mutationPending } = useMutation({
    mutationFn: ({ dto, idempotencyKey }: { dto: CreateOrderDto; idempotencyKey: string }) =>
      api.orders.create(dto, idempotencyKey),
  });

  const loading = mutationPending || isSubmitting;

  // P1-C: GHN shipping-fee preview. RESIL-01 split the failure modes: a `400`
  // means GHN refuses this address (the buyer must pick another one — retrying
  // will not help), a `503` means GHN is down and the fee is simply unknown.
  // Only the address case blocks checkout; an outage still degrades gracefully.
  const {
    mutate: calcShipping,
    data: shippingResult,
    isPending: shippingPending,
    isError: shippingFailed,
    error: shippingError,
    reset: resetShipping,
  } = useMutation({
    mutationFn: (address: Address) =>
      api.orders.getShippingFee({
        shippingAddress: buildGhnShippingAddress(address),
        items: buildShippingFeeItems(items, productMap),
        // GHN-ADDR-01: preview against the exact district/ward the user picked,
        // so the fee shown here is the one the waybill will be built from.
        ...ghnLocationIds(address),
      }),
    // GHN-WARD-01: GHN retires wards, and a ward list cached earlier in the
    // session still offers the dead ones. Drop it on a refusal so the buyer's
    // re-pick is made from the list GHN will actually accept.
    onError: (error) => {
      if (isGhnAddressRefusal(error)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shipping.wardsAll });
      }
    },
  });

  const shippingFee = shippingResult?.shippingFee ?? 0;
  const shippingFailure = shippingFailed ? shippingFeeFailure(shippingError, lang) : null;
  // A rejected address cannot be shipped at all — let the buyer fix it instead
  // of placing an order GHN will refuse to carry.
  const addressRejected = shippingFailure?.kind === 'address';

  // F3 + VOUCHER-SHOP-01 phase 2: a checkout stacks at most 1 platform code +
  // 1 code per shop. Every change re-validates the WHOLE set — the platform
  // code is priced on what the shop codes leave, so the amounts move together.
  // `applied` is the last set the backend accepted: a failed attempt to add a
  // code keeps it, so one bad code never wipes the ones already working.
  const [voucherInput, setVoucherInput] = useState("");
  const [applied, setApplied] = useState<{
    signature: string;
    validation: VoucherValidation;
  } | null>(null);
  const {
    mutate: validateVoucher,
    isPending: voucherPending,
    isError: voucherFailed,
    error: voucherError,
    reset: resetVoucher,
  } = useMutation({
    mutationFn: (codes: string[]) =>
      api.orders.validateVoucher({
        ...voucherValidateCodes(codes),
        items: buildOrderItems(items, productMap),
      }),
  });

  // A validated discount is priced against the exact basket contents — one
  // taken on another basket is never displayed or redeemed.
  const basketSignature = buildCheckoutSignature(
    items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      ...(i.skuId != null ? { skuId: i.skuId } : {}),
    })),
  );
  const appliedVoucher =
    applied?.signature === basketSignature ? applied.validation : null;
  const appliedVouchers = appliedVoucher ? appliedVoucherRows(appliedVoucher) : [];
  const appliedCodes = appliedVouchers.map((v) => v.code);
  useEffect(() => {
    resetVoucher();
  }, [basketSignature, resetVoucher]);

  // F3 (VOUCHER-SHOP-01): codes the buyer can pick instead of guessing, already
  // priced against this exact basket — hence the signature in the key.
  //
  // Degrades silently on purpose: a backend without the route answers 404, and
  // the list is a convenience layer over the manual input, not a gate. `retry:
  // false` keeps a missing route from costing three round-trips per basket
  // change, and an error simply renders no list.
  //
  // VOUCHER-AVAIL-STACK-01: the applied codes ride along, so the backend prices
  // platform rows after the shop discounts and flags a shop row that would break
  // the applied platform code. `keepPreviousData` keeps the list on screen while
  // an apply/remove refetches it under the new key.
  const { data: voucherSuggestionData } = useQuery({
    queryKey: queryKeys.orders.availableVouchers(basketSignature, appliedCodes),
    queryFn: () =>
      api.orders.getAvailableVouchers(
        availableVouchersRequest(buildOrderItems(items, productMap), appliedCodes),
      ),
    enabled: items.length > 0 && productsReady,
    retry: false,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const voucherSuggestions = sortVoucherSuggestions(voucherSuggestionData?.vouchers ?? []);

  // Picking a row still goes through validate: the suggestion is a hint priced
  // a moment ago, and the last redemption can be taken in between (409). A
  // listed code brings its slot, so it swaps out the code holding that slot.
  function applyVoucher(code: string): void {
    if (!code) return;
    const signature = basketSignature;
    const slot = voucherSuggestions.find((v) => v.code === code);
    validateVoucher(nextVoucherCodes(appliedVouchers, code, slot), {
      onSuccess: (validation) => {
        setApplied({ signature, validation });
        setVoucherInput("");
      },
    });
  }

  // Dropping one code re-prices the rest (the platform share grows back).
  function handleRemoveVoucher(code: string): void {
    const rest = appliedCodes.filter((c) => c !== code);
    resetVoucher();
    if (rest.length === 0) {
      setApplied(null);
      return;
    }
    const signature = basketSignature;
    validateVoucher(rest, {
      onSuccess: (validation) => setApplied({ signature, validation }),
      // The remainder no longer validates on its own — redeem nothing rather
      // than an amount the backend would price differently.
      onError: () => setApplied(null),
    });
  }

  const discountAmount = appliedVoucher?.discountAmount ?? 0;
  const grandTotal = discountedGrandTotal(totalPrice, discountAmount, shippingFee);

  // A previewed fee is priced against the chosen address + basket. Recompute it
  // automatically whenever either changes (once product data is ready for
  // accurate weights) so the fee shows without a manual click and never goes
  // stale. GHN failures degrade gracefully — see the summary render below.
  const selectedAddressId = selectedAddress?.id ?? null;
  useEffect(() => {
    resetShipping();
    if (!selectedAddress || !productsReady || items.length === 0) return;
    calcShipping(selectedAddress);
    // items/productMap are captured fresh each run; the primitive keys below are
    // what should retrigger the preview (address change, basket change, load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, basketSignature, productsReady]);

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

  function onSubmit(data: CheckoutFormData): Promise<void> | void {
    if (outcomeUnknown) {
      setConfirmRetryOpen(true);
      return;
    }
    return submitOrder(data);
  }

  function confirmRetry(): void {
    setConfirmRetryOpen(false);
    setOutcomeUnknown(false);
    // The buyer checked their order list and found nothing — a fresh key is
    // the only way past the 300s hold, and is safe now that no order exists.
    idemKeyRef.current = null;
    void handleSubmit(submitOrder)();
  }

  async function submitOrder(data: CheckoutFormData): Promise<void> {
    setStockError({});

    if (!selectedAddress) {
      setError("root", { message: t("addressRequired") });
      return;
    }

    try {
      const productIds = items.map((item) => item.productId);
      const stockData = await api.products.getMultipleWithInventory(productIds);
      const newStockError = findStockShortages(items, stockData, lang);
      if (Object.keys(newStockError).length > 0) {
        setStockError(newStockError);
        return;
      }
    } catch {
      // skip stock check on error — backend will validate
    }

    try {
      const orderItems = buildOrderItems(items, productMap);
      idemKeyRef.current = resolveIdempotencyKey(
        idemKeyRef.current,
        buildCheckoutSignature(orderItems),
        () => crypto.randomUUID(),
      );
      let placed: Awaited<ReturnType<typeof placeOrder>>;
      try {
        placed = await placeOrder({
          dto: {
            paymentMethod: data.paymentMethod,
            shippingAddress: buildGhnShippingAddress(selectedAddress),
            items: orderItems,
            // GHN-ADDR-01: same exact ids the fee was previewed with, so the
            // waybill is built for the address the buyer actually chose.
            ...ghnLocationIds(selectedAddress),
            // F3: redeem exactly the set the preview accepted.
            ...voucherCreateCodes(appliedCodes),
          },
          idempotencyKey: idemKeyRef.current.key,
        });
      } catch (createErr: unknown) {
        // SWEEP-1002-01: a 408/5xx/network drop (or the 409 a same-key retry gets
        // while the backend holds the key) may hide a committed order — send the
        // buyer to check their orders instead of inviting a blind retry.
        if (!isOrderOutcomeUnknown(createErr)) throw createErr;
        invalidateOrderViews({ all: true });
        setOutcomeUnknown(true);
        return;
      }
      // const so the `"orders" in result` alias below narrows the union.
      const result = placed;
      invalidateOrderViews({ all: true });
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
          if (!paymentUrl) throw new Error(t('noPaymentUrl'));
          // P0-04: do NOT clear the cart here. Record what this checkout covered
          // so PaymentResultPage can remove exactly those items once the gateway
          // confirms success — a cancelled/failed payment leaves the cart intact.
          setPendingCheckout({
            orderIds: orders.map((o) => o.id),
            cartItemIds: isPartial ? items.map((i) => i.id) : [],
            clearAll: !isPartial,
          });
          redirectToPaymentGateway(paymentUrl);
        } catch (paymentErr: unknown) {
          // PROD-PAY-01: the route now fails loudly with a reason instead of an
          // endless `orderUrl: null` — keep it out of the void so the failure is
          // diagnosable. The buyer sees it on the order page, where the retry lives.
          console.error('Payment URL failed:', paymentUrlErrorMessage(paymentErr));
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
      // GHN-CREATE-01: create can now answer 400 for an undeliverable address —
      // show the buyer the same wording as the fee banner, not GHN's raw English.
      setError("root", { message: checkoutSubmitErrorMessage(err, lang) });
    }
  }

  if (successOrderIds) {
    return (
      <div className="min-h-screen bg-canvas-base flex items-center justify-center">
        <div className="bg-canvas-surface border border-bdr rounded-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-5 text-center">
          <CheckCircle size={56} className="text-accent-green" />
          <div>
            <h2 className="font-display font-black text-2xl text-ink-pri m-0 mb-1">
              {t("successTitle")}
            </h2>
            <p className="font-body text-sm text-ink-sec m-0">
              {t("orderCodes")}{" "}
              <span className="font-mono text-accent-amber">
                {successOrderIds.map((id) => `#${id}`).join(", ")}
              </span>
            </p>
          </div>
          <p className="font-body text-xs text-ink-muted m-0">
            {t("autoRedirect")}
          </p>
          <GradientButton
            onClick={() => void navigate("/orders")}
            className="w-full py-3"
          >
            {t("viewOrders")}
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
          <p className="text-sm">{t("cartLoadFailed")}</p>
          <GradientButton
            onClick={() => void navigate(-1 as never)}
            className="py-2 px-6"
          >
            {t("back")}
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
            {t("cartEmpty")}
          </p>
          <GradientButton
            onClick={() => void navigate("/")}
            className="py-2 px-6"
          >
            {t("keepShopping")}
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
          <ArrowLeft size={16} /> {t("back")}
        </button>
        <h1 className="font-display text-xl font-black uppercase tracking-wide text-ink-pri m-0">
          {t("title")}
        </h1>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 pt-5 flex items-center gap-2 font-body text-xs text-ink-muted">
        <span>{t("crumbCart")}</span>
        <ChevronRight size={12} />
        <span className="text-accent-amber font-semibold">{t("crumbPayment")}</span>
        <ChevronRight size={12} />
        <span>{t("crumbDone")}</span>
      </div>

      {/* Two-column layout */}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-6 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          {/* LEFT — form */}
          <div className="flex flex-col gap-4">
            {outcomeUnknown && (
              <div
                role="alert"
                className="bg-tb-amber/10 border border-accent-amber text-ink-pri px-4 py-3 rounded-xl text-sm flex flex-col gap-1"
              >
                <span className="font-semibold">{t("outcomeUnknownTitle")}</span>
                <span className="text-ink-sec">
                  {t("outcomeUnknownBody")}{" "}
                  <Link to="/orders" className="text-accent-amber font-semibold underline">
                    {t("myOrders")}
                  </Link>
                  {" "}
                  {t("outcomeUnknownAfter")}
                </span>
              </div>
            )}
            {errors.root?.message && (
              <div className="bg-tb-red/10 border border-accent-red text-accent-red px-4 py-3 rounded-xl text-sm">
                {errors.root.message}
              </div>
            )}

            {/* Address */}
            <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
              <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-ink-pri">
                {t("sectionAddress")}
              </h2>
              <AddressBookPicker
                selectedId={selectedAddress?.id ?? null}
                onSelect={setSelectedAddress}
              />
              {/* GHN-MSG-01: a refused address is a problem with this field, so
                  say so here — not only as a line next to the disabled button. */}
              {addressRejected && shippingFailure && (
                <p className="m-0 rounded-xl border border-accent-red bg-tb-red/10 px-4 py-3 font-body text-xs leading-relaxed text-accent-red">
                  {shippingFailure.message}
                </p>
              )}
            </div>

            {/* Payment method */}
            <div className="bg-canvas-elevated rounded-tb-card border border-bdr p-5 flex flex-col gap-4">
              <h2 className="m-0 font-display font-bold text-base uppercase tracking-[0.04em] text-ink-pri">
                {t("sectionPayment")}
              </h2>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-2.5">
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
                              "flex items-center gap-3.5 px-[18px] py-3.5 text-left rounded-tb-cta border w-full cursor-pointer",
                              active
                                ? "bg-tb-amber/[0.08] border-tb-amber/50"
                                : "bg-tb-elevated border-tb-border",
                            )}
                          >
                            <span
                              className={cn(
                                "size-5 rounded-full shrink-0 border-2 grid place-items-center",
                                active ? "border-tb-amber" : "border-tb-muted",
                              )}
                            >
                              {active && (
                                <span className="size-2.5 rounded-full bg-tb-amber" />
                              )}
                            </span>
                            <Icon
                              size={18}
                              className={cn(
                                "shrink-0",
                                active ? "text-accent-amber" : "text-ink-sec",
                              )}
                            />
                            <span className="flex-1 font-body font-semibold text-sm text-ink-pri">
                              {name}
                            </span>
                          </button>
                        );
                      })
                    )}
                    {errors.paymentMethod && (
                      <span className="text-xs text-accent-red">
                        {translateIfKey(checkoutMessages, lang, errors.paymentMethod.message)}
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
                  {t("sectionItems", { count: items.length })}
                </span>
              </div>
              {productsError ? (
                <div className="px-4 py-6 text-center text-accent-red text-sm">
                  {t("productsLoadFailed")}
                </div>
              ) : items.map((item) => {
                const product = productMap.get(item.productId);
                const name = product?.name ?? (productsLoading ? "" : t("productGone"));
                const imageUrl = productCoverImage(product) ?? "";
                const variantLabel = buildVariantLabel(item.skuTierIdx, product?.variations);
                return (
                <div
                  key={item.id}
                  className={cn(
                    "px-4 py-3 border-b border-bdr last:border-b-0",
                    stockError[item.productId] && "bg-tb-red/10",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {productsLoading ? (
                      <Skeleton className="w-14 h-14 rounded-tb-input shrink-0" />
                    ) : (
                      <ProductThumb
                        src={imageUrl}
                        alt={name}
                        className="w-14 h-14 rounded-tb-input"
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
                        {formatVnd(getEffectivePrice(item), lang)}
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
                        disabled={isMutating || !canIncreaseCartLine(item.quantity)}
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
                        {formatVnd(getEffectivePrice(item) * item.quantity, lang)}
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
                <span>{t("subtotal")}</span>
                <span className="font-mono">{formatVnd(totalPrice, lang)}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm text-ink-sec gap-2">
                <span>{t("shippingFee")}</span>
                {shippingPending ? (
                  <span className="text-ink-muted">{t("calculating")}</span>
                ) : shippingResult ? (
                  shippingFee === 0 ? (
                    <span className="text-accent-green font-medium">{t("free")}</span>
                  ) : (
                    <span className="font-mono">{formatVnd(shippingFee, lang)}</span>
                  )
                ) : shippingFailure ? (
                  <span
                    className={cn(
                      'text-right text-xs',
                      addressRejected ? 'text-accent-red' : 'text-ink-muted',
                    )}
                  >
                    {addressRejected ? t('undeliverable') : t('feeOnDelivery')}
                  </span>
                ) : (
                  <span className="text-ink-muted">
                    {selectedAddress ? t("calculating") : t("pickAddress")}
                  </span>
                )}
              </div>
              {/* Vouchers (F3 / VOUCHER-SHOP-01 phase 2) — previewed via
                  /voucher/validate, redeemed on create. Total first, then one
                  row per code; the input stays open to add the next code. */}
              {appliedVoucher && (
                <div className="mb-2 flex flex-col gap-1">
                  <div className="flex justify-between items-center gap-2 text-sm text-ink-sec">
                    <span>{t("discount")}</span>
                    <span className="font-mono text-accent-green">
                      −{formatVnd(appliedVoucher.discountAmount, lang)}
                    </span>
                  </div>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1">
                    {appliedVouchers.map((row) => (
                      <li
                        key={row.code}
                        className="flex justify-between items-center gap-2 pl-2 text-xs text-ink-muted"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-accent-amber truncate">
                            {row.code}
                          </span>
                          {row.scope && (
                            <span className="shrink-0 rounded-full border border-bdr px-1.5 font-body text-[10px]">
                              {voucherScopeLabel({ scope: row.scope }, lang)}
                            </span>
                          )}
                          <IconButton
                            aria-label={t("removeVoucher", { code: row.code })}
                            disabled={voucherPending}
                            onClick={() => handleRemoveVoucher(row.code)}
                            className="size-5 rounded-full text-ink-muted hover:text-ink-pri hover:bg-canvas-elevated transition-colors shrink-0 disabled:opacity-50"
                          >
                            <X size={12} className="shrink-0" />
                          </IconButton>
                        </span>
                        <span className="font-mono shrink-0">
                          −{formatVnd(row.discountAmount, lang)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mb-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyVoucher(normalizeVoucherCode(voucherInput));
                      }
                    }}
                    placeholder={appliedVoucher ? t("addVoucher") : t("voucherCode")}
                    aria-label={t("voucherCode")}
                    className="h-9 flex-1 min-w-0 bg-canvas-base border border-bdr rounded-tb-input px-3 text-ink-pri font-mono text-[13px] uppercase placeholder:normal-case placeholder:font-body placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => applyVoucher(normalizeVoucherCode(voucherInput))}
                    disabled={voucherPending || !voucherInput.trim()}
                    className="h-9 px-3 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-body font-semibold text-[13px] whitespace-nowrap transition-colors enabled:cursor-pointer enabled:hover:border-accent-amber disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {voucherPending ? t("checking") : t("apply")}
                  </button>
                </div>
                {voucherFailed && (
                  <span className="text-xs text-accent-red">
                    {voucherErrorMessage(voucherError, lang)}
                  </span>
                )}
                {/* Suggestions (VOUCHER-SHOP-01) — absent whenever the backend
                    cannot price them, so the manual input above still stands
                    on its own. */}
                {voucherSuggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-0.5">
                    <span className="font-body text-[11px] uppercase tracking-[0.04em] text-ink-muted">
                      {t("suggestionsTitle")}
                    </span>
                    <span className="font-body text-[11px] leading-[1.4] text-ink-muted">
                      {t("suggestionsRule")}
                    </span>
                    <ul className="flex flex-col gap-1.5 m-0 p-0 list-none max-h-56 overflow-y-auto">
                      {voucherSuggestions.map((suggestion) => {
                        const isApplied = appliedCodes.includes(suggestion.code);
                        return (
                          <li key={suggestion.code}>
                            <button
                              type="button"
                              onClick={() => applyVoucher(suggestion.code)}
                              disabled={!suggestion.isEligible || isApplied || voucherPending}
                              aria-pressed={isApplied}
                              className={cn(
                                'w-full flex items-start justify-between gap-2 rounded-tb-input border px-2.5 py-2 text-left transition-colors',
                                isApplied
                                  ? 'border-tb-amber/50 bg-tb-amber/[0.08] cursor-default'
                                  : suggestion.isEligible
                                    ? 'border-bdr bg-canvas-base enabled:cursor-pointer enabled:hover:border-accent-amber'
                                    : 'border-bdr bg-canvas-base opacity-50 cursor-not-allowed',
                              )}
                            >
                              <span className="flex flex-col gap-0.5 min-w-0">
                                <span className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-mono text-[13px] text-accent-amber truncate">
                                    {suggestion.code}
                                  </span>
                                  <span className="shrink-0 rounded-full border border-bdr px-1.5 font-body text-[10px] text-ink-muted">
                                    {voucherScopeLabel(suggestion, lang)}
                                  </span>
                                </span>
                                <span className="font-body text-[11px] leading-[1.4] text-ink-muted">
                                  {suggestion.isEligible
                                    ? (suggestion.description ?? t('suggestionUsable'))
                                    : voucherIneligibleMessage(suggestion, (n) => formatVnd(n, lang), lang)}
                                </span>
                              </span>
                              {isApplied ? (
                                <span className="shrink-0 font-body text-[11px] font-semibold text-accent-amber">
                                  {t("applied")}
                                </span>
                              ) : suggestion.isEligible ? (
                                <span className="shrink-0 font-mono text-[13px] text-accent-green">
                                  −{formatVnd(voucherSuggestionDiscount(suggestion), lang)}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-bdr">
                <span className="font-semibold text-ink-pri">
                  {t("total")}
                </span>
                <span className="font-mono font-black text-2xl text-accent-amber">
                  {formatVnd(grandTotal, lang)}
                </span>
              </div>
            </div>

            {shippingFailure && (
              <div
                className={cn(
                  'rounded-xl border px-4 py-3 font-body text-xs leading-relaxed',
                  addressRejected
                    ? 'border-accent-red bg-tb-red/10 text-accent-red'
                    : 'border-bdr bg-canvas-surface text-ink-sec',
                )}
              >
                {addressRejected
                  ? t("fixAddress")
                  : shippingFailure.message}
              </div>
            )}

            <GradientButton
              type="submit"
              disabled={
                loading ||
                voucherPending ||
                productsError ||
                !selectedAddress ||
                addressRejected ||
                Object.keys(stockError).length > 0
              }
              className="w-full py-4 text-lg font-bold rounded-xl"
            >
              {loading ? t("placing") : t("placeOrder")}
            </GradientButton>

            <p className="text-center font-body text-xs text-ink-muted leading-relaxed m-0">
              {t("termsBefore")}{" "}
              <span className="text-ink-sec underline cursor-pointer">
                {t("terms")}
              </span>{" "}
              {t("and")}{" "}
              <span className="text-ink-sec underline cursor-pointer">
                {t("privacy")}
              </span>{" "}
              {t("termsAfter")}
            </p>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmRetryOpen}
        title={t("retryConfirmTitle")}
        description={t("retryConfirmBody")}
        confirmLabel={t("retryConfirmAction")}
        cancelLabel={t("retryConfirmCancel")}
        tone="danger"
        onConfirm={confirmRetry}
        onCancel={() => setConfirmRetryOpen(false)}
      />
    </div>
  );
}
