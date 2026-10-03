import { useState, type ReactElement } from 'react';
import { FileDown, Hourglass } from 'lucide-react';
import { useCreateExportJob, useOrderExport } from './useOrderExport';
import {
  EXPORT_JOB_MAX_DAYS,
  EXPORT_MAX_DAYS,
  defaultExportRange,
  exportJobErrorMessage,
  exportRangeError,
  isOverSyncRowCap,
  needsBackgroundExport,
  orderExportErrorMessage,
} from './orderExport';
import { ExportJobList } from './ExportJobList';
import { ExportSellerPicker } from './ExportSellerPicker';
import { DateField } from '@/components/shared/DateField';
import { orderStatusLabel } from '@/lib/domain/orderStatus';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { orderExportMessages } from './orderExport.i18n';
import { cn } from '@/lib/format/utils';
import type { OrderExportScope, OrderStatus, UserSearchResult } from '@/types';

interface OrderExportPanelProps {
  /** `seller` exports the signed-in seller's own orders; `admin` the whole platform. */
  scope: OrderExportScope;
  /** The status tab on screen — the export carries the same filter, or all statuses when absent. */
  status?: OrderStatus;
}

const ACTION_BUTTON_CLASS = cn(
  'inline-flex items-center gap-1.5 h-11 px-4 rounded-tb-input border border-bdr',
  'bg-canvas-elevated text-ink-pri font-body font-semibold text-sm cursor-pointer',
  'hover:border-accent-amber transition-colors',
  'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-bdr',
);

/**
 * EXPORT-CSV-01 — downloads orders as a CSV over a chosen date range. Up to 90
 * days the file downloads directly (T1–T4); a longer window (≤ 366 days), or a
 * direct export refused for its row count, is built as a background job (T5)
 * and shows up under "File đã xuất" when ready. The range is validated on the
 * client first (`exportRangeError`) because a failed request is a worse way to
 * learn about a reversed range than a line of text under the pickers.
 */
export function OrderExportPanel({ scope, status }: OrderExportPanelProps): ReactElement {
  const [range, setRange] = useState(() => defaultExportRange());
  const [seller, setSeller] = useState<UserSearchResult | null>(null);
  const exportCsv = useOrderExport(scope);
  const createJob = useCreateExportJob(scope);
  const t = useT(orderExportMessages);
  const { lang } = useLanguage();

  const rangeError = exportRangeError(range.from, range.to, EXPORT_JOB_MAX_DAYS, lang);
  const background = needsBackgroundExport(range.from, range.to);
  // A server-side refusal (over 5 000 rows, unknown status) only shows until
  // the user touches the filters again — at which point it is stale advice.
  const requestError = exportCsv.isError ? orderExportErrorMessage(exportCsv.error, lang) : null;
  const jobError = createJob.isError ? exportJobErrorMessage(createJob.error, lang) : null;
  const errorMsg = rangeError ?? jobError ?? requestError;
  const offerJob = background || (exportCsv.isError && isOverSyncRowCap(exportCsv.error));

  const resetRequests = (): void => {
    exportCsv.reset();
    createJob.reset();
  };

  const handleRangeChange = (key: 'from' | 'to', value: string): void => {
    resetRequests();
    setRange(prev => ({ ...prev, [key]: value }));
  };

  const handleSellerChange = (next: UserSearchResult | null): void => {
    resetRequests();
    setSeller(next);
  };

  const params = { from: range.from, to: range.to, status, sellerId: seller?.id };

  const handleExport = (): void => {
    if (rangeError) return;
    createJob.reset();
    exportCsv.mutate(params);
  };

  const handleCreateJob = (): void => {
    if (rangeError) return;
    exportCsv.reset();
    createJob.mutate(params);
  };

  return (
    <div className="bg-canvas-surface border border-bdr rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <DateField
            id="export-from"
            label={t('from')}
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
            label={t('to')}
            min={range.from}
            value={range.to}
            rangeFrom={range.from}
            rangeTo={range.to}
            onChange={iso => handleRangeChange('to', iso)}
            hasError={rangeError !== null}
          />
        </div>
        {scope === 'admin' && <ExportSellerPicker value={seller} onChange={handleSellerChange} />}
        {!background && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exportCsv.isPending || rangeError !== null}
            className={ACTION_BUTTON_CLASS}
          >
            <FileDown size={15} className="shrink-0" />
            {exportCsv.isPending ? t('exporting') : t('exportCsv')}
          </button>
        )}
        {offerJob && (
          <button
            type="button"
            onClick={handleCreateJob}
            disabled={createJob.isPending || rangeError !== null}
            className={ACTION_BUTTON_CLASS}
          >
            <Hourglass size={15} className="shrink-0" />
            {createJob.isPending ? t('sending') : t('createJob')}
          </button>
        )}
        <p className="font-body text-xs text-ink-muted m-0 pb-3">
          {t('hint', { direct: EXPORT_MAX_DAYS, job: EXPORT_JOB_MAX_DAYS })}{' '}
          {status ? t('onlyStatus', { status: orderStatusLabel(status, lang) }) : t('anyStatus')}
        </p>
      </div>
      {errorMsg && (
        <p className="font-body text-xs text-accent-red mt-2 mb-0">{errorMsg}</p>
      )}
      {createJob.isSuccess && (
        <p className="font-body text-xs text-accent-green mt-2 mb-0">
          {t('jobCreated')}
        </p>
      )}
      <ExportJobList scope={scope} />
    </div>
  );
}
