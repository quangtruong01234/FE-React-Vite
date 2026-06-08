import { useState } from 'react';
import { Plus, Package2, BarChart2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils';
import { useProducts } from '../product/useProducts';
import CreateProductModal from '../product/CreateProductModal';
import type { ProductWithInventory } from '@/types';

const CONDITION_LABEL: Record<string, string> = {
  new: 'Mới',
  used: 'Đã dùng',
  refurbished: 'Tân trang',
};

const CONDITION_CLASS: Record<string, string> = {
  new: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  used: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  refurbished: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
};

function ProductRow({ product }: { product: ProductWithInventory }) {
  const stock = product.inventory?.availableStock ?? 0;
  const isLow = product.inventory?.isLowStock;

  return (
    <tr className="border-b border-bdr hover:bg-canvas-elevated/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="size-10 rounded-tb-card object-cover shrink-0 bg-canvas-elevated"
            />
          ) : (
            <div className="size-10 rounded-tb-card bg-canvas-elevated grid place-items-center shrink-0">
              <Package2 size={18} className="shrink-0 text-ink-muted" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-body font-medium text-ink-pri truncate max-w-[200px]">{product.name}</p>
            <p className="text-xs text-ink-muted font-mono">{product.sku}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-ink-sec">{product.category?.name ?? '—'}</td>
      <td className="py-3 px-4 text-sm text-accent-amber font-mono whitespace-nowrap">{formatPrice(product.price)}</td>
      <td className="py-3 px-4">
        <span
          className={cn(
            'text-sm font-mono font-medium',
            isLow ? 'text-accent-red' : 'text-ink-sec',
          )}
        >
          {stock}
          {isLow && (
            <span className="ml-1 text-xs text-accent-red">(!)</span>
          )}
        </span>
      </td>
      <td className="py-3 px-4">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-tb-pill border text-xs font-medium',
            CONDITION_CLASS[product.condition] ?? CONDITION_CLASS.new,
          )}
        >
          {CONDITION_LABEL[product.condition] ?? product.condition}
        </span>
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
          'size-10 rounded-tb-input grid place-items-center shrink-0',
          danger ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-amber/10 text-accent-amber',
        )}
      >
        <Icon size={18} className="shrink-0" />
      </div>
      <div>
        <p className="text-xl font-display font-semibold text-ink-pri">{value}</p>
        <p className="text-xs text-ink-sec">{label}</p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-bdr">
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-tb-card shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-36 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          </td>
          <td className="py-3 px-4"><Skeleton className="h-3.5 w-20 rounded" /></td>
          <td className="py-3 px-4"><Skeleton className="h-3.5 w-24 rounded" /></td>
          <td className="py-3 px-4"><Skeleton className="h-3.5 w-10 rounded" /></td>
          <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-tb-pill" /></td>
        </tr>
      ))}
    </>
  );
}

export default function ShopPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useProducts({ limit: 50 });
  const products = data?.data ?? [];

  const totalStock = products.reduce((s, p) => s + (p.inventory?.availableStock ?? 0), 0);
  const lowStockCount = products.filter(p => p.inventory?.isLowStock).length;

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl font-display font-semibold text-ink-pri">Kênh người bán</h1>
            <p className="text-sm text-ink-sec mt-1">Quản lý sản phẩm của bạn</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-tb-gradient text-ink-pri border-0 gap-2 shadow-tb-cta shrink-0"
          >
            <Plus size={16} className="shrink-0" />
            Tạo sản phẩm
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          <StatCard label="Tổng sản phẩm" value={isLoading ? 0 : products.length} icon={Package2} />
          <StatCard label="Tổng tồn kho" value={isLoading ? 0 : totalStock} icon={BarChart2} />
          <StatCard
            label="Sắp hết hàng"
            value={isLoading ? 0 : lowStockCount}
            icon={AlertTriangle}
            danger={lowStockCount > 0}
          />
        </div>

        {/* Product table */}
        <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
          <div className="px-5 py-4 border-b border-bdr">
            <h2 className="text-sm font-body font-medium text-ink-pri">
              Danh sách sản phẩm
              {!isLoading && products.length > 0 && (
                <span className="ml-2 text-ink-muted font-normal">({products.length})</span>
              )}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-bdr">
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">Sản phẩm</th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">Danh mục</th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">Giá</th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">Tồn kho</th>
                  <th className="py-2.5 px-4 text-xs font-body font-medium text-ink-muted">Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableSkeleton />
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-12 rounded-tb-card bg-canvas-elevated grid place-items-center">
                          <Package2 size={22} className="shrink-0 text-ink-muted" />
                        </div>
                        <p className="text-sm text-ink-sec">Chưa có sản phẩm nào</p>
                        <button
                          type="button"
                          onClick={() => setShowCreate(true)}
                          className="text-xs text-accent-amber hover:underline underline-offset-2 transition-colors"
                        >
                          Tạo sản phẩm đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map(p => <ProductRow key={p.id} product={p} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateProductModal
          onProductCreated={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
