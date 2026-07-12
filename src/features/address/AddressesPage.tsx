import { useState, type ReactElement } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { IconButton } from '@/components/shared/IconButton';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/format/utils';
import { AddressFormModal } from './AddressFormModal';
import { useAddresses, useSetDefaultAddress, useDeleteAddress } from './useAddresses';
import { formatAddressSummary } from './addressUtils';
import type { Address } from '@/types';

function AddressRow({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  settingDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  settingDefault: boolean;
}): ReactElement {
  return (
    <li className="bg-canvas-surface border border-bdr rounded-tb-card p-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <MapPin size={20} className="shrink-0 text-accent-amber mt-0.5" />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-body font-semibold text-sm text-ink-pri">
            {address.recipientName}
          </span>
          <span className="font-mono text-xs text-ink-muted">{address.phone}</span>
          {address.isDefault && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-amber border border-accent-amber/40 rounded-full px-1.5 py-0.5">
              Mặc định
            </span>
          )}
        </div>
        <p className="font-body text-xs text-ink-sec m-0">{formatAddressSummary(address)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!address.isDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            disabled={settingDefault}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-tb-input border border-bdr text-xs font-medium text-ink-sec hover:border-accent-amber/50 hover:text-ink-pri transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {settingDefault ? (
              <Loader2 size={13} className="animate-spin shrink-0" />
            ) : (
              <Star size={13} className="shrink-0" />
            )}
            Đặt mặc định
          </button>
        )}
        <IconButton
          onClick={onEdit}
          aria-label="Chỉnh sửa địa chỉ"
          className="size-8 rounded-tb-input border border-bdr text-ink-sec hover:border-accent-amber/50 hover:text-ink-pri transition-colors cursor-pointer"
        >
          <Pencil size={14} className="shrink-0" />
        </IconButton>
        <IconButton
          onClick={onDelete}
          aria-label="Xóa địa chỉ"
          className="size-8 rounded-tb-input border border-bdr text-ink-sec hover:border-accent-red/50 hover:text-accent-red transition-colors cursor-pointer"
        >
          <Trash2 size={14} className="shrink-0" />
        </IconButton>
      </div>
    </li>
  );
}

export default function AddressesPage(): ReactElement {
  const { data: addresses, isLoading, error } = useAddresses();
  const setDefault = useSetDefaultAddress();
  const deleteAddress = useDeleteAddress();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  const list = addresses ?? [];

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(address: Address): void {
    setEditing(address);
    setFormOpen(true);
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    await deleteAddress.mutateAsync(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display font-black text-3xl uppercase tracking-tight text-ink-pri m-0 flex items-center gap-2.5">
              <MapPin size={26} className="text-accent-amber shrink-0" />
              Sổ địa chỉ
            </h1>
            <p className="text-sm text-ink-sec m-0">
              {addresses ? `${list.length} địa chỉ giao hàng` : ''}
            </p>
          </div>
          <GradientButton size="sm" onClick={openCreate}>
            <Plus size={16} className="shrink-0" />
            Thêm địa chỉ
          </GradientButton>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-tb-ghost bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm font-body">
            {(error as { message?: string }).message ?? 'Không thể tải sổ địa chỉ. Vui lòng thử lại.'}
          </div>
        )}

        {isLoading ? (
          <ul className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="bg-canvas-surface border border-bdr rounded-tb-card p-4">
                <Skeleton className="h-4 w-40 bg-canvas-elevated rounded" />
                <Skeleton className="h-3 w-64 bg-canvas-elevated rounded mt-2" />
              </li>
            ))}
          </ul>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <MapPin size={48} className="text-ink-muted shrink-0" />
            <div>
              <p className="font-display font-bold text-lg text-ink-pri m-0">Chưa có địa chỉ nào</p>
              <p className="text-sm text-ink-muted mt-1 m-0">
                Thêm địa chỉ giao hàng để thanh toán nhanh hơn.
              </p>
            </div>
            <GradientButton size="sm" onClick={openCreate}>
              <Plus size={16} className="shrink-0" />
              Thêm địa chỉ mới
            </GradientButton>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {list.map((address) => (
              <AddressRow
                key={address.id}
                address={address}
                onEdit={() => openEdit(address)}
                onDelete={() => setPendingDelete(address)}
                onSetDefault={() => setDefault.mutate(address.id)}
                settingDefault={setDefault.isPending && setDefault.variables === address.id}
              />
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <AddressFormModal
          open={formOpen}
          address={editing}
          onClose={() => setFormOpen(false)}
        />
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <DialogContent className="max-w-sm bg-canvas-surface border-bdr text-ink-pri">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-ink-pri">Xóa địa chỉ</DialogTitle>
            <DialogDescription className="text-sm text-ink-sec">
              {pendingDelete
                ? `Bạn có chắc muốn xóa địa chỉ của ${pendingDelete.recipientName}? Hành động này không thể hoàn tác.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {deleteAddress.error && (
            <p className="text-sm text-accent-red">Xóa địa chỉ thất bại. Vui lòng thử lại.</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="flex-1 bg-canvas-elevated border border-bdr rounded-tb-cta py-2.5 text-sm font-semibold text-ink-sec cursor-pointer hover:border-accent-amber/50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleteAddress.isPending}
              className={cn(
                'flex-1 rounded-tb-cta py-2.5 text-sm font-semibold cursor-pointer transition-colors',
                'bg-accent-red/15 border border-accent-red/40 text-accent-red hover:bg-accent-red/25',
                'disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
              )}
            >
              {deleteAddress.isPending && <Loader2 size={14} className="animate-spin shrink-0" />}
              Xóa
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
