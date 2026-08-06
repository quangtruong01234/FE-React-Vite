import { type ReactElement } from 'react';
import { FileDown } from 'lucide-react';
import { useOrderInvoice } from './useOrderInvoice';
import { invoiceErrorMessage } from './orderInvoice';
import { IconButton } from '@/components/shared/IconButton';
import { cn } from '@/lib/format/utils';

interface InvoiceDownloadButtonProps {
  orderId: string;
  /** Compact icon-only presentation (e.g. admin order table rows). */
  iconOnly?: boolean;
  /** Override the default button classes (full variant only). */
  className?: string;
  label?: string;
}

/**
 * Downloads the order invoice PDF. Shared across the buyer order detail, the
 * seller order queue, and the admin orders table — the backend now allows the
 * order's buyer, its seller, OR an admin to pull it (2026-07-15). Owns its own
 * mutation so each button tracks its own pending/error state, and surfaces a
 * Vietnamese error (403/404/…) instead of failing silently.
 */
export function InvoiceDownloadButton({
  orderId,
  iconOnly = false,
  className,
  label = 'Tải hóa đơn PDF',
}: InvoiceDownloadButtonProps): ReactElement {
  const download = useOrderInvoice();
  const errorMsg = download.isError ? invoiceErrorMessage(download.error) : null;

  if (iconOnly) {
    return (
      <IconButton
        onClick={() => download.mutate(orderId)}
        disabled={download.isPending}
        aria-label={label}
        title={errorMsg ?? label}
        className={cn(
          'size-8 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec hover:border-accent-amber transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
          errorMsg && 'border-accent-red text-accent-red',
          className,
        )}
      >
        <FileDown size={15} className="shrink-0" />
      </IconButton>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => download.mutate(orderId)}
        disabled={download.isPending}
        className={cn(
          'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-pri font-semibold text-sm cursor-pointer hover:border-accent-amber transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
          className,
        )}
      >
        <FileDown size={15} className="shrink-0" />
        {download.isPending ? 'Đang tải...' : label}
      </button>
      {errorMsg && <span className="font-body text-xs text-accent-red">{errorMsg}</span>}
    </div>
  );
}
