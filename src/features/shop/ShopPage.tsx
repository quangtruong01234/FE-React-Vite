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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/format/utils";
import { formatPrice } from "@/lib/format/utils";
import { useProducts } from "../product/useProducts";
import { productCategoryNames } from "../product/productCategories";
import { buildLowStockRows } from "./lowStock";
import { IconButton } from "@/components/shared/IconButton";
import { ProductThumb } from "@/components/shared/ProductThumb";
import { api } from "@/api";
import { queryKeys } from "@/hooks/query/queryKeys";
import { useAuthContext } from "@/context/AuthContext";
import type { ProductWithInventory } from "@/types";

const CONDITION_LABEL: Record<string, string> = {
  new: "Mới",
  used: "Đã dùng",
  refurbished: "Tân trang",
};

const CONDITION_CLASS: Record<string, string> = {
  new: "bg-accent-green/10 text-accent-green border-accent-green/20",
  used: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  refurbished: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
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
  const stock = product.inventory?.availableStock ?? 0;
  const isLow = product.inventory?.isLowStock;
  const isBlocked = product.approvalBlocked ?? false;
  const categoryNames = productCategoryNames(product);

  return (
    <tr className="border-b border-bdr hover:bg-canvas-elevated/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <ProductThumb
            src={product.imageUrl}
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
        {formatPrice(product.price)}
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
          {CONDITION_LABEL[product.condition] ?? product.condition}
        </span>
      </td>
      <td className="py-3 px-4">
        {isBlocked ? (
          <div
            className="flex items-center gap-1.5"
            title="Bị ẩn do vi phạm — liên hệ admin"
          >
            <ShieldAlert size={14} className="shrink-0 text-accent-red" />
            <span className="text-xs font-body text-accent-red">Bị khoá</span>
          </div>
        ) : (
          <span className="text-xs font-body text-accent-green">
            Bình thường
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <div
          className="inline-flex"
          title={
            isBlocked ? "Sản phẩm bị khoá — không thể bật hiển thị" : undefined
          }
        >
          <ToggleSwitch
            size="sm"
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
            className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber/50 hover:text-accent-amber transition-colors"
          >
            <Pencil size={13} className="shrink-0" />
          </IconButton>
          <IconButton
            onClick={onDelete}
            disabled={isDeleting}
            className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-red/50 hover:text-accent-red transition-colors disabled:opacity-40"
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
            ? "bg-accent-red/10 text-accent-red"
            : "bg-accent-amber/10 text-accent-amber",
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: () => {
      alert("Xóa sản phẩm thất bại. Vui lòng thử lại.");
    },
  });

  const SHOP_QUERY_KEY = queryKeys.products.list(shopParams);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
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
      const label = name ? `"${name}"` : "Sản phẩm";
      setToast(isActive ? `Đã bật hiển thị ${label}.` : `Đã ẩn ${label}.`);
      toastTimer.current = setTimeout(() => setToast(null), 2500);
    },
  });

  function handleEdit(id: number): void {
    navigate(`/sell/${id}`);
  }

  function handleDelete(id: number): void {
    if (!window.confirm("Xóa sản phẩm này?")) return;
    deleteMutation.mutate(id);
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, search]);

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

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink-pri">
              Kênh người bán
            </h1>
            {toast === "__blocked__" ? (
              <div className="flex items-center gap-1.5 mt-1">
                <ShieldAlert size={13} className="shrink-0 text-accent-red" />
                <span className="text-sm font-body text-accent-red">
                  Sản phẩm bị khoá — không thể bật hiển thị. Liên hệ admin.
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
                Quản lý sản phẩm của bạn
              </p>
            )}
          </div>
          <Button
            onClick={() => navigate("/sell")}
            className="bg-tb-gradient text-ink-pri border-0 gap-2 shadow-tb-cta shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            Đăng sản phẩm
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard
            label="Tổng sản phẩm"
            value={showSkeleton ? 0 : productCount}
            icon={Package2}
          />
          <StatCard
            label="Tổng tồn kho"
            value={showSkeleton ? 0 : totalStock}
            icon={BarChart2}
          />
          <StatCard
            label="Sắp hết hàng"
            value={showSkeleton ? 0 : lowStockCount}
            icon={AlertTriangle}
            danger={lowStockCount > 0}
          />
        </div>

        {/* Low-stock list */}
        {lowStockRows.length > 0 && (
          <div className="bg-canvas-surface border border-accent-red/30 rounded-tb-card overflow-hidden mb-7">
            <div className="px-5 py-4 border-b border-bdr flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-accent-red" />
              <h2 className="text-sm font-body font-medium text-ink-pri">
                Sản phẩm sắp hết hàng
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
                      Còn {row.availableStock}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Tối thiểu {row.minimumStock}
                    </p>
                  </div>
                  <IconButton
                    onClick={() => handleEdit(row.productId)}
                    className="size-7 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber/50 hover:text-accent-amber transition-colors shrink-0"
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
              Danh sách sản phẩm
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
                placeholder="Tìm tên hoặc SKU..."
                className="w-full bg-canvas-elevated border border-bdr rounded-tb-input pl-8 pr-3 py-1.5 text-sm font-body text-ink-pri placeholder:text-ink-muted outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/20 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Sản phẩm
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Danh mục
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Giá
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Tồn kho
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Tình trạng
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Duyệt
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Hiển thị
                  </th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">
                    Thao tác
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
                          Chưa có sản phẩm nào
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/sell")}
                          className="text-xs text-accent-amber hover:underline underline-offset-2 transition-colors"
                        >
                          Đăng sản phẩm đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <p className="text-sm text-ink-muted font-body">
                        Không tìm thấy sản phẩm nào.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      onEdit={() => handleEdit(p.id)}
                      onDelete={() => handleDelete(p.id)}
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
    </div>
  );
}
