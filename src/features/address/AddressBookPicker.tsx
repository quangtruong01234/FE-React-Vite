import { useEffect, useState, type ReactElement } from 'react';
import { Plus, Check, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { useAddresses } from './useAddresses';
import { pickDefaultAddress, formatAddressSummary } from './addressUtils';
import { AddressFormModal } from './AddressFormModal';
import type { Address } from '@/types';

interface AddressBookPickerProps {
  selectedId: number | null;
  onSelect: (address: Address) => void;
}

/**
 * Checkout's saved-address chooser: radio-style cards of the user's address
 * book plus an "add new" action. Auto-selects the default address once the
 * book loads and nothing is chosen yet.
 */
export function AddressBookPicker({
  selectedId,
  onSelect,
}: AddressBookPickerProps): ReactElement {
  const { data: addresses, isLoading, isError } = useAddresses();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!addresses || selectedId !== null) return;
    const preset = pickDefaultAddress(addresses);
    if (preset) onSelect(preset);
  }, [addresses, selectedId, onSelect]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted text-sm py-6">
        <Loader2 size={16} className="animate-spin shrink-0" />
        Đang tải sổ địa chỉ…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-accent-red py-4">
        Không tải được sổ địa chỉ. Vui lòng thử lại.
      </p>
    );
  }

  const list = addresses ?? [];

  return (
    <div className="flex flex-col gap-3">
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <MapPin size={24} className="shrink-0 text-ink-muted" />
          <p className="text-sm text-ink-sec">Bạn chưa có địa chỉ giao hàng nào.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((addr) => {
            const selected = addr.id === selectedId;
            return (
              <li key={addr.id}>
                <button
                  type="button"
                  onClick={() => onSelect(addr)}
                  className={cn(
                    'w-full text-left rounded-tb-card border p-3.5 transition-colors cursor-pointer',
                    'flex items-start gap-3',
                    selected
                      ? 'border-accent-amber bg-accent-amber/5'
                      : 'border-bdr bg-canvas-base hover:border-accent-amber/40',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 size-4 shrink-0 rounded-full border grid place-items-center',
                      selected ? 'border-accent-amber bg-accent-amber' : 'border-bdr',
                    )}
                  >
                    {selected && <Check size={11} className="shrink-0 text-canvas-base" />}
                  </span>
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-body font-semibold text-sm text-ink-pri">
                        {addr.recipientName}
                      </span>
                      <span className="font-mono text-xs text-ink-muted">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-amber border border-accent-amber/40 rounded-full px-1.5 py-0.5">
                          Mặc định
                        </span>
                      )}
                    </span>
                    <span className="font-body text-xs text-ink-sec">
                      {formatAddressSummary(addr)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center justify-center gap-2 rounded-tb-card border border-dashed border-bdr py-2.5 text-sm font-medium text-ink-sec hover:border-accent-amber/50 hover:text-ink-pri transition-colors cursor-pointer"
      >
        <Plus size={16} className="shrink-0" />
        Thêm địa chỉ mới
      </button>

      {modalOpen && (
        <AddressFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={(saved) => onSelect(saved)}
        />
      )}
    </div>
  );
}
