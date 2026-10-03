import type { ReactElement } from 'react';
import { Download } from 'lucide-react';
import { useDownloadExportJob, useExportJobs } from './useOrderExport';
import {
  EXPORT_JOB_STATE_META,
  exportJobErrorMessage,
  exportJobStatusLabel,
  formatExportDay,
} from './orderExport';
import { formatDateTime } from '@/lib/format/time';
import { cn } from '@/lib/format/utils';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { LANG_LOCALE } from '@/lib/i18n/lang';
import { orderExportMessages } from './orderExport.i18n';
import type { OrderExportScope } from '@/types';

interface ExportJobListProps {
  scope: OrderExportScope;
}

/**
 * EXPORT-CSV-01 T5 — "File đã xuất": the caller's background exports of this
 * scope. Stays hidden until there is at least one job, so a user who only ever
 * downloads directly never sees an empty box.
 */
export function ExportJobList({ scope }: ExportJobListProps): ReactElement | null {
  const jobs = useExportJobs(scope);
  const download = useDownloadExportJob();
  const t = useT(orderExportMessages);
  const { lang } = useLanguage();

  if (jobs.isError) {
    return (
      <p className="font-body text-xs text-ink-muted mt-3 mb-0">
        {t('jobsLoadFailed')}
      </p>
    );
  }
  if (!jobs.data || jobs.data.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-bdr">
      <h3 className="font-display font-semibold text-sm text-ink-pri m-0 mb-2">{t('exportedFiles')}</h3>
      <ul aria-label={t('exportedFiles')} className="m-0 p-0 list-none flex flex-col gap-2">
        {jobs.data.map(job => {
          const meta = EXPORT_JOB_STATE_META[job.state];
          const isDownloading = download.isPending && download.variables?.id === job.id;
          return (
            <li
              key={job.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-ink-sec"
            >
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 font-medium rounded-tb-pill border',
                  meta.badgeClass,
                )}
              >
                {t(meta.labelKey)}
              </span>
              <span className="text-ink-pri">
                {formatExportDay(job.from, lang)} – {formatExportDay(job.to, lang)}
              </span>
              <span>{exportJobStatusLabel(job.statusFilter, lang)}</span>
              {job.rowCount !== null && (
                <span>
                  {t('rows', { count: job.rowCount, n: job.rowCount.toLocaleString(LANG_LOCALE[lang]) })}
                </span>
              )}
              {job.state === 'done' && job.expiresAt && (
                <span className="text-ink-muted">
                  {t('expires', { time: formatDateTime(job.expiresAt, lang) })}
                </span>
              )}
              {job.state === 'failed' && job.errorMessage && (
                <span className="text-accent-red">{job.errorMessage}</span>
              )}
              {job.state === 'done' && (
                <button
                  type="button"
                  onClick={() => download.mutate(job)}
                  disabled={download.isPending}
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 h-8 px-3 rounded-tb-input border border-bdr',
                    'bg-canvas-elevated text-ink-pri font-semibold cursor-pointer',
                    'hover:border-accent-amber transition-colors',
                    'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-bdr',
                  )}
                >
                  <Download size={13} className="shrink-0" />
                  {isDownloading ? t('downloading') : t('download')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {download.isError && (
        <p className="font-body text-xs text-accent-red mt-2 mb-0">
          {exportJobErrorMessage(download.error, lang)}
        </p>
      )}
    </div>
  );
}
