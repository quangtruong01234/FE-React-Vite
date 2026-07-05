import { useState, type ReactElement } from 'react';
import { CopyCheck } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { cn } from '@/lib/format/utils';
import type { ComboItem, VarGroup, FormErrors, SkuRowState } from './useProductForm';

const cellInput = cn(
  'w-full bg-canvas-base border border-bdr rounded-tb-input',
  'px-2.5 py-1.5 text-ink-pri font-mono text-xs placeholder:text-ink-muted',
  'outline-none transition-colors',
  'focus:border-accent-amber/50 focus:ring-2 focus:ring-accent-amber/20',
);

interface Props {
  combos: ComboItem[];
  validGroups: VarGroup[];
  rows: Record<string, SkuRowState>;
  errors: FormErrors;
  onSetRow: (tierIdx: string, field: 'price' | 'stockQuantity', value: string) => void;
  onApplyAll: (field: 'price' | 'stockQuantity', value: string) => void;
}

export function SkuMatrix({
  combos,
  validGroups,
  rows,
  errors,
  onSetRow,
  onApplyAll,
}: Props): ReactElement {
  const [applyPrice, setApplyPrice] = useState('');
  const [applyStock, setApplyStock] = useState('');

  function handleApplyAll(): void {
    if (applyPrice) onApplyAll('price', applyPrice);
    if (applyStock) onApplyAll('stockQuantity', applyStock);
  }

  const hasTwoGroups = validGroups.length >= 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-tb-card border border-bdr">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-bdr bg-canvas-elevated">
              {validGroups.map(g => (
                <th
                  key={g.name}
                  className="text-left px-3 py-2.5 font-body font-semibold text-xs text-ink-sec uppercase tracking-wide whitespace-nowrap"
                >
                  {g.name}
                </th>
              ))}
              <th className="text-left px-3 py-2.5 font-body font-semibold text-xs text-ink-sec uppercase tracking-wide whitespace-nowrap">
                Giá (VND) *
              </th>
              <th className="text-left px-3 py-2.5 font-body font-semibold text-xs text-ink-sec uppercase tracking-wide whitespace-nowrap">
                Kho
              </th>
              <th className="text-left px-3 py-2.5 font-body font-semibold text-xs text-ink-muted uppercase tracking-wide whitespace-nowrap">
                TierIdx
              </th>
            </tr>

            {/* Apply-all row */}
            <tr className="border-b border-bdr bg-canvas-surface/60">
              {validGroups.map((_, gi) => (
                <td key={gi} className="px-3 py-2">
                  {gi === 0 && (
                    <span className="text-xs text-ink-muted font-body italic">Áp dụng tất cả</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Giá chung"
                  value={applyPrice}
                  onChange={e => setApplyPrice(e.target.value)}
                  className={cellInput}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Kho chung"
                  value={applyStock}
                  onChange={e => setApplyStock(e.target.value)}
                  className={cellInput}
                />
              </td>
              <td className="px-3 py-2">
                <IconButton
                  onClick={handleApplyAll}
                  disabled={!applyPrice && !applyStock}
                  className={cn(
                    'size-7 rounded-tb-input',
                    'bg-accent-amber/10 text-accent-amber border border-accent-amber/20',
                    'hover:bg-accent-amber/20 transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                  title="Áp dụng cho tất cả"
                >
                  <CopyCheck size={13} className="shrink-0" />
                </IconButton>
              </td>
            </tr>
          </thead>

          <tbody>
            {combos.map((combo, idx) => {
              const row = rows[combo.tierIdx] ?? { price: '', stockQuantity: '' };
              const hasPriceError = !!errors.skuMatrix && (!row.price || Number(row.price) <= 0);

              if (hasTwoGroups) {
                return (
                  <tr
                    key={combo.tierIdx}
                    className={cn(
                      'border-b border-bdr last:border-0',
                      idx % 2 === 1 && 'bg-canvas-surface/20',
                    )}
                  >
                    <td className="px-3 py-2 text-xs text-ink-pri font-body font-medium whitespace-nowrap">
                      {combo.labels[0]}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-sec font-body whitespace-nowrap">
                      {combo.labels[1]}
                    </td>
                    <td className="px-3 py-2 w-32">
                      <input
                        type="number"
                        min="0"
                        placeholder="Nhập giá"
                        value={row.price}
                        onChange={e => onSetRow(combo.tierIdx, 'price', e.target.value)}
                        className={cn(cellInput, hasPriceError && 'border-accent-red')}
                      />
                    </td>
                    <td className="px-3 py-2 w-28">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.stockQuantity}
                        onChange={e => onSetRow(combo.tierIdx, 'stockQuantity', e.target.value)}
                        className={cellInput}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-ink-muted font-mono">{combo.tierIdx}</span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={combo.tierIdx}
                  className={cn(
                    'border-b border-bdr last:border-0',
                    idx % 2 === 1 && 'bg-canvas-surface/20',
                  )}
                >
                  <td className="px-3 py-2 text-xs text-ink-pri font-body font-medium whitespace-nowrap">
                    {combo.labels[0]}
                  </td>
                  <td className="px-3 py-2 w-32">
                    <input
                      type="number"
                      min="0"
                      placeholder="Nhập giá"
                      value={row.price}
                      onChange={e => onSetRow(combo.tierIdx, 'price', e.target.value)}
                      className={cn(cellInput, hasPriceError && 'border-accent-red')}
                    />
                  </td>
                  <td className="px-3 py-2 w-28">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={row.stockQuantity}
                      onChange={e => onSetRow(combo.tierIdx, 'stockQuantity', e.target.value)}
                      className={cellInput}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-ink-muted font-mono">{combo.tierIdx}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {errors.skuMatrix && (
        <p className="text-xs text-accent-red font-body">{errors.skuMatrix}</p>
      )}
    </div>
  );
}
