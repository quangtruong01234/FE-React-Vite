import { useState, useRef, useMemo } from "react";
import {
  Plus,
  Package2,
  BarChart2,
  AlertTriangle,
  Pencil,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ToggleSwitch } from "@/components/shared/ToggleSwitch";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/format/utils";
import { formatPrice } from "@/lib/format/utils";
import { productCoverImage } from "@/lib/domain/productImage";
import { useProducts } from "../product/useProducts";
import { productCategoryNames } from "../product/productCategories";
import { buildLowStockRows } from "./lowStock";
import { lowStockSeries, stockHealthSlices } from "./stockChartData";
import { filterProductsByQuery } from "./productSearch";
import { ChartFrame } from "@/components/shared/charts/ChartFrame";
import { ChartLegend } from "@/components/shared/charts/ChartLegend";
import { DoughnutChart } from "@/components/shared/charts/DoughnutChart";
import { RankedBarChart } from "@/components/shared/charts/RankedBarChart";
import type { ChartSlice } from "@/lib/chart/chartSeries";
import { IconButton } from "@/components/shared/IconButton";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { api } from "@/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { useAuthContext } from "@/context/useAuthContext";
import type { ProductWithInventory } from "@/types";
import { useT } from "@/hooks/ui/useT";
import { useLanguage } from "@/context/useLanguage";
import { shopMessages, type ShopMessageKey } from "./shop.i18n";

/**
 * Fixed legend for the low-stock bars: the bar colours encode severity
 * (`lowStockSeries`), so the legend must name those two states plus the
 * threshold series rather than sample whichever row happens to be first.
 */
const LOW_STOCK_LEGEND: readonly (Omit<ChartSlice, "label"> & {
  label: ShopMessageKey;
})[] = [
  { key: "low", label: "sliceLow", value: 0, color: "amber" },
  { key: "out", label: "sliceOut", value: 0, color: "red" },
  { key: "minimum", label: "lowMinimum", value: 0, color: "muted" },
];

const CONDITION_LABEL: Partial<Record<string, ShopMessageKey>> = {
  new: "conditionNew",
  used: "conditionUsed",
  refurbished: "conditionRefurbished",
};

const CONDITION_CLASS: Record<string, string> = {
  new: "bg-tb-green/10 text-accent-green border-tb-green/20",
  used: "bg-tb-amber/10 text-accent-amber border-tb-amber/20",
  refurbished: "bg-tb-cyan/10 text-accent-cyan border-tb-cyan/20",
};

function ProductRow({
  product,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
  isTogglingActive,
}: {
  product: ProductWithInventory;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isDeleting: boolean;
  isTogglingActive: boolean;
}) {
  const t = useT(shopMessages);
  const { lang } = useLanguage();
  const conditionKey = CONDITION_LABEL[product.condition];
  const stock = product.inventory?.availableStock ?? 0;
  const isLow = product.inventory?.isLowStock;
  const isBlocked = product.approvalBlocked ?? false;
  const categoryNames = productCategoryNames(product);

  return (
    <tr className="border-b border-bdr hover:bg-tb-elevated/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <ProductThumb
            src={productCoverImage(product)}
            alt={product.name}
            iconSize={18}
            className="size-10 rounded-tb-card"
          />
          <div className="min-w-0">
            <Link
              to={`/product/${product.id}`}
              className="text-sm font-body font-medium text-ink-pri truncate max-w-[200px] hover:text-accent-amber transition-colors block"
            >
              {product.name}
            </Link>
            <p className="text-xs text-ink-muted font-mono">{product.sku}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        {categoryNames.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {categoryNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center px-2 py-0.5 rounded-tb-pill border border-bdr bg-canvas-elevated text-xs font-body text-ink-sec"
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-ink-sec">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-accent-amber font-mono whitespace-nowrap">
        {formatPrice(product.price, lang)}
      </td>
      <td className="py-3 px-4">
        <span
          className={cn(
            "text-sm font-mono font-medium",
            isLow ? "text-accent-red" : "text-ink-sec",
          )}
        >
          {stock}
          {isLow && <span className="ml-1 text-xs text-accent-red">(!)</span>}
        </span>
      </td>
      <td className="py-3 px-4">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-tb-pill border text-xs font-medium",
            CONDITION_CLASS[product.condition] ?? CONDITION_CLASS.new,
          )}
        >
          {conditionKey ? t(conditionKey) : product.condition}
        </span>
      </td>
      <td className="py-3 px-4">
        {isBlocked ? (
          <div
            className="flex items-center gap-1.5"
            title={t("blockedHint")}
          >
            <ShieldAlert size={14} className="shrink-0 text-accent-red" />
            <span className="text-xs font-body text-accent-red">
              {t("blocked")}
            </span>
          </div>
        ) : (
          <span className="text-xs font-body text-accent-green">
            {t("approved")}
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <div
          className="inline-flex"
          title={
isBlocked ? t("blockedToggleHint") : undefined
          }
        >
          <ToggleSwitch
            size="sm"
            label={t("toggleVisible", { name: product.name })}
            checked={product.isActive ?? true}
            onChange={onToggleActive}
            disabled={isTogglingActive || isBlocked}
          />
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <IconButton
            onClick={onEdit}
            aria-label={t("editProduct", { name: product.name })}
            className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-tb-amber/50 hover:text-accent-amber transition-colors"
          >
            <Pencil size={13} className="shrink-0" />
          </IconButton>
          <IconButton
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={t("deleteProduct", { name: product.name })}
            className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-tb-red/50 hover:text-accent-red transition-colors disabled:opacity-40"
          >
            <Trash2 size={13} className="shrink-0" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  danger,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card p-4 flex items-center gap-4">
      <div
        className={cn(
          "size-10 rounded-tb-input grid place-items-center shrink-0",
          danger
            ? "bg-tb-red/10 text-accent-red"
            : "bg-tb-amber/10 text-accent-amber",
        )}
      >
        <Icon size={18} className="shrink-0" />
      </div>
      <div>
        <p className="text-xl font-display font-semibold text-ink-pri">
          {value}
        </p>
        <p className="text-xs text-ink-sec">{label}</p>
      </div>
    </div>
  );
}

const skCls = "bg-canvas-elevated";

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-bdr">
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Skeleton
                className={cn("size-10 rounded-tb-card shrink-0", skCls)}
              />
              <div className="space-y-1.5">
                <Skeleton className={cn("h-3.5 w-36 rounded", skCls)} />
                <Skeleton className={cn("h-3 w-20 rounded", skCls)} />
              </div>
            </div>
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-3.5 w-20 rounded", skCls)} />
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-3.5 w-24 rounded", skCls)} />
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-3.5 w-10 rounded", skCls)} />
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-5 w-16 rounded-tb-pill", skCls)} />
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-4 w-16 rounded", skCls)} />
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-5 w-9 rounded-tb-pill", skCls)} />
          </td>
          <td className="py-3 px-4">
            <Skeleton className={cn("h-7 w-16 rounded-tb-input", skCls)} />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function ShopPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser } = useAuthContext();
  const t = useT(shopMessages);
  const { lang } = useLanguage();
  // `userId` is LOAD-BEARING, not a convenience filter (backend 2026-08-03):
  // `GET /api/products` now defaults to active-only, and the `userId` branch is
  // the sole exception that still returns every state. Drop it and the seller's
  // own deactivated / risk-blocked products vanish from their dashboard.
  const shopParams = { limit: 50, userId: currentUser?.id };
  const { data, isLoading, isFetching } = useProducts(shopParams);
  const showSkeleton = isLoading || isFetching;
  // Stable identity so the useMemo hooks below don't re-run every render.
  const products = useMemo(() => data?.data ?? [], [data]);

  // Shop-wide stats from a dedicated endpoint (counts the whole shop, not just
  // the current page) — falls back to client-side aggregation while loading.
  const { data: shopStats } = useQuery({
    queryKey: queryKeys.products.shopStats,
    queryFn: () => api.products.getShopStats(),
  });

  // Low-stock rows behind the "Sắp hết hàng" stat card — server-scoped to this
  // shop's products (`GET /inventory/low-stock`, role shop/admin).
  const { data: lowStockRecords } = useQuery({
    queryKey: queryKeys.inventory.lowStock,
    queryFn: () => api.inventory.getLowStock(),
  });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [search, setSearch] = useState("");
  /** The row waiting on the delete confirm modal. */
  const [pendingDelete, setPendingDelete] =
    useState<ProductWithInventory | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setPendingDelete(null);
    },
    // No `onError`: the failure is rendered inside the confirm modal, which
    // stays open so the seller can retry on the same row.
  });

  const SHOP_QUERY_KEY = queryKeys.products.list(shopParams);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.products.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: SHOP_QUERY_KEY });
      const prev = queryClient.getQueryData(SHOP_QUERY_KEY);
      queryClient.setQueryData(SHOP_QUERY_KEY, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((p) => (p.id === id ? { ...p, isActive } : p)),
        };
      });
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(SHOP_QUERY_KEY, ctx.prev);
      const apiErr = err as { statusCode?: number };
      if (apiErr.statusCode === 400) {
        clearTimeout(toastTimer.current);
        setToast("__blocked__");
        toastTimer.current = setTimeout(() => setToast(null), 3000);
      }
    },
    onSuccess: (_data, { id, isActive }) => {
      clearTimeout(toastTimer.current);
      const name = products.find((p) => p.id === id)?.name ?? "";
      // Worded in the language active when the toggle lands; the toast is gone in 2.5s.
      setToast(
        name
          ? t(isActive ? "toastShown" : "toastHidden", { name })
          : t(isActive ? "toastShownUnnamed" : "toastHiddenUnnamed"),
      );
      toastTimer.current = setTimeout(() => setToast(null), 2500);
    },
  });

  function handleEdit(id: string): void {
    navigate(`/sell/${id}`);
  }

  function confirmDelete(): void {
    if (!pendingDelete) return;
    deleteMutation.mutate(pendingDelete.id);
  }

  const filteredProducts = useMemo(
    () => filterProductsByQuery(products, search),
    [products, search],
  );

  const lowStockRows = useMemo(
    () => buildLowStockRows(lowStockRecords ?? []),
    [lowStockRecords],
  );

  const productCount = shopStats?.productCount ?? products.length;
  const totalStock =
    shopStats?.totalStock ??
    products.reduce((s, p) => s + (p.inventory?.availableStock ?? 0), 0);
  const lowStockCount =
    shopStats?.lowStockCount ??
    products.filter((p) => p.inventory?.isLowStock).length;

  const stockHealth = useMemo(
    () => stockHealthSlices(productCount, lowStockCount, lang),
    [productCount, lowStockCount, lang],
  );
  const lowStockLegend = useMemo<ChartSlice[]>(
    () => LOW_STOCK_LEGEND.map((slice) => ({ ...slice, label: t(slice.label) })),
    [t],
  );
  const lowStockChart = useMemo(() => lowStockSeries(lowStockRows), [lowStockRows]);

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink-pri">
              {t("title")}
            </h1>
            {toast === "__blocked__" ? (
              <div className="flex items-center gap-1.5 mt-1">
                <ShieldAlert size={13} className="shrink-0 text-accent-red" />
                <span className="text-sm font-body text-accent-red">
                  {t("blockedToast")}
                </span>
              </div>
            ) : toast ? (
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2
                  size={13}
                  className="shrink-0 text-accent-green"
                />
                <span className="text-sm font-body text-accent-green">
                  {toast}
                </span>
              </div>
            ) : (
              <p className="text-sm text-ink-sec mt-1">
                {t("subtitle")}
              </p>
            )}
          </div>
          <Button
            onClick={() => navigate("/sell")}
            className="bg-tb-gradient text-ink-on-accent border-0 gap-2 shadow-tb-cta shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            {t("newProduct")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard
            label={t("statProducts")}
            value={showSkeleton ? 0 : productCount}
            icon={Package2}
          />
          <StatCard
            label={t("statStock")}
            value={showSkeleton ? 0 : totalStock}
            icon={BarChart2}
          />
          <StatCard
            label={t("statLowStock")}
            value={showSkeleton ? 0 : lowStockCount}
            icon={AlertTriangle}
            danger={lowStockCount > 0}
          />
        </div>

        {/* Stock charts */}
        <div className="grid md:grid-cols-2 gap-4 mb-7">
          <ChartFrame
            title={t("healthTitle")}
            subtitle={t("healthSubtitle", {
              products: productCount,
              stock: totalStock,
            })}
            height={180}
            isLoading={showSkeleton}
          >
            <div className="flex items-center gap-5 size-full">
              <div className="w-1/2 h-full shrink-0">
                <DoughnutChart
                  slices={stockHealth}
                  ariaLabel={t("healthAria")}
                  centerValue={String(productCount)}
                  centerLabel={t("healthCenter")}
                  valueFormatter={(v) => t("healthValue", { value: v })}
                />
              </div>
              <ChartLegend
                slices={stockHealth}
                showPercent
                className="flex-1 min-w-0"
              />
            </div>
          </ChartFrame>

          <ChartFrame
            title={t("lowTitle")}
            subtitle={t("lowSubtitle")}
            height={180}
            isLoading={showSkeleton}
            isEmpty={lowStockChart.slices.length === 0}
            emptyLabel={t("lowEmpty")}
            footer={
              <ChartLegend
                layout="inline"
                className="mt-3"
                showValues={false}
                slices={lowStockLegend}
              />
            }
          >
            <RankedBarChart
              slices={lowStockChart.slices}
              valueLabel={t("lowValueLabel")}
              ariaLabel={t("lowAria")}
              labelWidth={120}
              comparison={{
                label: t("lowMinimum"),
                color: "muted",
                values: lowStockChart.minimums,
              }}
            />
          </ChartFrame>
        </div>

        {/* Low-stock list */}
        {lowStockRows.length > 0 && (
          <div className="bg-canvas-surface border border-tb-red/30 rounded-tb-card overflow-hidden mb-7">
            <div className="px-5 py-4 border-b border-bdr flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-accent-red" />
              <h2 className="text-sm font-body font-medium text-ink-pri">
                {t("lowTitle")}
              </h2>
              <span className="text-sm text-ink-muted font-normal">
                ({lowStockRows.length})
              </span>
            </div>
            <ul className="divide-y divide-bdr">
              {lowStockRows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${row.productId}`}
                      className="text-sm font-body font-medium text-ink-pri truncate block hover:text-accent-amber transition-colors"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-ink-muted font-mono">{row.sku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-medium text-accent-red">
                      {t("lowRemaining", { n: row.availableStock })}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {t("lowMinimumValue", { n: row.minimumStock })}
                    </p>
                  </div>
                  <IconButton
                    onClick={() => handleEdit(row.productId)}
                    aria-label={t("editProduct", { name: row.name })}
                    className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-tb-amber/50 hover:text-accent-amber transition-colors shrink-0"
                  >
                    <Pencil size={13} className="shrink-0" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Product table */}
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <div className="px-5 py-4 border-b border-bdr flex items-center gap-4">
            <h2 className="text-sm font-body font-medium text-ink-pri shrink-0">
              {t("tableTitle")}
              {!showSkeleton && products.length > 0 && (
                <span className="ml-2 text-ink-muted font-normal">
                  ({search.trim() ? `${filteredProducts.length}/` : ""}
                  {products.length})
                </span>
              )}
            </h2>
            <div className="relative ml-auto w-56">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 shrink-0 text-ink-muted pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full bg-canvas-elevated border border-bdr rounded-tb-input pl-8 pr-3 py-1.5 text-sm font-body text-ink-pri placeholder:text-ink-muted outline-none focus:border-tb-amber/50 focus:ring-1 focus:ring-tb-amber/20 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colProduct")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colCategory")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colPrice")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colStock")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colCondition")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colApproval")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colVisible")}
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    {t("colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {showSkeleton ? (
                  <TableSkeleton />
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-12 rounded-tb-card bg-canvas-elevated grid place-items-center">
                          <Package2
                            size={22}
                            className="shrink-0 text-ink-muted"
                          />
                        </div>
                        <p className="text-sm text-ink-sec">
                          {t("emptyCatalogue")}
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/sell")}
                          className="text-xs text-accent-amber hover:underline underline-offset-2 transition-colors"
                        >
                          {t("firstProduct")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <p className="text-sm text-ink-muted font-body">
                        {t("noMatch")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onEdit={() => handleEdit(p.id)}
                      onDelete={() => {
                        // Clear a previous row's failure before asking again.
                        deleteMutation.reset();
                        setPendingDelete(p);
                      }}
                      onToggleActive={() =>
                        toggleActiveMutation.mutate({
                          id: p.id,
                          isActive: !(p.isActive ?? true),
                        })
                      }
                      isDeleting={
                        deleteMutation.isPending &&
                        deleteMutation.variables === p.id
                      }
                      isTogglingActive={
                        toggleActiveMutation.isPending &&
                        toggleActiveMutation.variables?.id === p.id
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={t("deleteTitle")}
        description={
          pendingDelete
            ? t("deleteBody", { name: pendingDelete.name })
            : ""
        }
        confirmLabel={t("deleteConfirm")}
        isPending={deleteMutation.isPending}
        error={
          deleteMutation.isError
            ? t("deleteFailed")
            : null
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
