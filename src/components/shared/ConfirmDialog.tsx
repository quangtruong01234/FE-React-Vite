import { type ReactElement, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GradientButton } from '@/components/shared/GradientButton';
import { cn } from '@/lib/format/utils';

/**
 * The project's confirm box, and the only sanctioned one: `window.confirm` is
 * banned in `src/` (core.md). The native dialog is unstyled ("localhost:5173
 * says"), blocks the main thread, cannot show a pending or error state, and is
 * auto-suppressed by Chrome DevTools MCP / Playwright — which made every flow
 * behind it impossible to verify in a browser.
 *
 * Consumers: admin role change, address delete, product delete, post delete,
 * comment delete, voucher deactivate, voucher one-way edit, SKU removal.
 */

export type ConfirmTone = 'default' | 'danger';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** The consequence, in full. This is the part `window.confirm` truncated. */
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for destructive, irreversible actions (delete, cancel an order). */
  tone?: ConfirmTone;
  /** Keeps the dialog open and both buttons locked while the request is in flight. */
  isPending?: boolean;
  /** Shown inside the dialog so a failed confirm does not close it silently. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const buttonBase =
  'flex-1 rounded-tb-cta py-2.5 text-sm font-semibold cursor-pointer transition-colors ' +
  'inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  tone = 'default',
  isPending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement {
  // A request in flight owns the dialog: an overlay click or Esc would drop the
  // pending state on the floor while the mutation keeps running.
  function handleOpenChange(next: boolean): void {
    if (!next && !isPending) onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm bg-canvas-surface border-bdr text-ink-pri">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-ink-pri">{title}</DialogTitle>
          <DialogDescription className="text-sm text-ink-sec">{description}</DialogDescription>
        </DialogHeader>

        {error != null && error !== '' && (
          <p className="m-0 text-sm font-body text-accent-red">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={cn(
              buttonBase,
              'bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50',
            )}
          >
            {cancelLabel}
          </button>
          {tone === 'danger' ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={cn(
                buttonBase,
                // `tb-red`, not `accent-red`: the alias is a `var()`, so Tailwind
                // drops every `/NN` class built on it (see /check-tailwind Check 8).
                'bg-tb-red/15 border border-tb-red/40 text-accent-red hover:bg-tb-red/25',
              )}
            >
              {isPending && <Loader2 size={14} className="shrink-0 animate-spin" />}
              {confirmLabel}
            </button>
          ) : (
            <GradientButton
              size="sm"
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1"
            >
              {isPending && <Loader2 size={14} className="shrink-0 animate-spin" />}
              {confirmLabel}
            </GradientButton>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
