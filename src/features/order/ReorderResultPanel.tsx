import type { ReactElement } from 'react';
import { ShoppingCart } from 'lucide-react';
import { GradientButton } from '@/components/shared/GradientButton';
import { useT } from '@/hooks/ui/useT';
import type { MessageKey } from '@/lib/i18n/messages';
import type { ReorderResult } from './useReorder';
import type { ReorderSkipReason } from './reorderItems';
import { orderMessages } from './order.i18n';

const REASON_KEY: Record<ReorderSkipReason, MessageKey<typeof orderMessages>> = {
  deleted: 'reorderReasonDeleted',
  unavailable: 'reorderReasonUnavailable',
  outOfStock: 'reorderReasonOutOfStock',
  failed: 'reorderReasonFailed',
};

interface ReorderResultPanelProps {
  result: ReorderResult;
  onGoToCart: () => void;
}

/** F10 — shown only when "Mua lại" could not re-add every line, per line. */
export function ReorderResultPanel({ result, onGoToCart }: ReorderResultPanelProps): ReactElement {
  const t = useT(orderMessages);
  const addedCount = result.cartLineIds.length;

  return (
    <div role="status" className="mt-4 bg-canvas-surface border border-bdr rounded-xl p-4 flex flex-col gap-3">
      <p className="m-0 font-body text-sm text-ink-pri">
        {addedCount > 0 ? t('reorderAdded', { count: addedCount }) : t('reorderNoneAdded')}
      </p>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('reorderSkippedTitle')}</span>
        <ul className="m-0 pl-4 flex flex-col gap-1 font-body text-sm text-ink-sec">
          {result.skipped.map(({ item, reason }) => (
            <li key={item.id}>
              <span className="text-ink-pri">{item.productName ?? t('productFallback', { id: String(item.productId) })}</span>
              {item.skuLabel ? ` (${item.skuLabel})` : ''} — {t(REASON_KEY[reason])}
            </li>
          ))}
        </ul>
      </div>
      {addedCount > 0 && (
        <GradientButton size="sm" onClick={onGoToCart} className="self-start">
          <ShoppingCart size={15} className="shrink-0" />
          {t('goToCart')}
        </GradientButton>
      )}
    </div>
  );
}
