import { useState, type ReactElement } from 'react';
import { FileDown } from 'lucide-react';
import { useSellerOrderExport } from './useSellerOrderExport';
import {
  EXPORT_MAX_DAYS,
  defaultExportRange,
  exportRangeError,
  sellerOrderExportErrorMessage,
} from './sellerOrderExport';
import { DateField } from '@/components/shared/DateField';
import { ORDER_STATUS_META } from '@/lib/domain/orderStatus';
import { cn } from '@/lib/format/utils';
import type { OrderStatus } from '@/types';

interface SellerOrderExportPanelProps {
  /** The status tab on screen — the export carries the same filter, or all statuses when absent. */
  status?: OrderStatus;
}

/**
 * EXPORT-CSV-01 — downloads the signed-in seller's orders as a CSV over a
 * chosen date range. The range is validated on the client first
 * (`exportRangeError`) because the backend answers a 400 for a reversed range
 * or a window over 90 days, and a failed download is a worse way to learn that
 * than a line of text under the pickers.
 */
export function SellerOrderExportPanel({ status }: SellerOrderExportPanelProps): ReactElement {
  const [range, setRange] = useState(() => defaultExportRange());
  const exportCsv = useSellerOrderExport();

  const rangeError = exportRangeError(range.from, range.to);
  // A server-side refusal (over 5 000 rows, unknown status) only shows until
  // the seller touches the pickers again — at which point it is stale advice.
  const requestError = exportCsv.isError ? sellerOrderExportErrorMessage(exportCsv.error) : null;
  const errorMsg = rangeError ?? requestError;

  const handleRangeChange = (key: 'from' | 'to', value: string): void => {
    exportCsv.reset();
    setRange(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = (): void => {
    if (rangeError) return;
    exportCsv.mutate({ from: range.from, to: range.to, status });
  };

  return (
    <div className="bg-canvas-surface border border-bdr rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <DateField
            id="export-from"
            label="Từ ngày"
            max={range.to}
            value={range.from}
            rangeFrom={range.from}
            rangeTo={range.to}
            onChange={iso => handleRangeChange('from', iso)}
            hasError={rangeError !== null}
          />
        </div>
        <div className="w-40">
          <DateField
            id="export-to"
            label="Đến ngày"
            min={range.from}
            value={range.to}
            rangeFrom={range.from}
            rangeTo={range.to}
            onChange={iso => handleRangeChange('to', iso)}
            hasError={rangeError !== null}
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportCsv.isPending || rangeError !== null}
          className={cn(
            'inline-flex items-center gap-1.5 h-11 px-4 rounded-tb-input border border-bdr',
            'bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer',
            'hover:border-accent-amber transition-colors',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-bdr',
          )}
        >
          <FileDown size={15} className="shrink-0" />
          {exportCsv.isPending ? 'Đang xuất…' : 'Xuất CSV'}
        </button>
        <p className="font-body text-xs text-ink-muted m-0 pb-3">
          Tối đa {EXPORT_MAX_DAYS} ngày · một dòng cho mỗi sản phẩm trong đơn ·{' '}
          {status ? `chỉ đơn “${ORDER_STATUS_META[status].label}”` : 'tất cả trạng thái'}
        </p>
      </div>
      {errorMsg && (
        <p className="font-body text-xs text-accent-red mt-2 mb-0">{errorMsg}</p>
      )}
    </div>
  );
}
