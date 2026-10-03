import type { ReactElement } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { formatDateTime } from '@/lib/format/time';
import { cn } from '@/lib/format/utils';
import { orderMessages } from './order.i18n';
import { orderTimelineRows } from './orderTimeline';
import { useOrderHistory } from './useOrder';

/**
 * ORDER-TIMELINE-01 — every recorded event of the order, oldest first, newest
 * highlighted. Purely additive: while loading, or when the backend lacks the
 * route (404 before the rollout) or refuses it, the card is simply absent.
 */
export function OrderHistoryCard({ orderId }: { orderId: string }): ReactElement | null {
  const t = useT(orderMessages);
  const { lang } = useLanguage();
  const { data } = useOrderHistory(orderId);

  if (!data || data.events.length === 0) return null;
  const rows = orderTimelineRows(data.events, lang);
  const lastIndex = rows.length - 1;

  return (
    <section
      aria-labelledby="order-history-heading"
      className="bg-canvas-surface border border-bdr rounded-xl p-4 mb-4"
    >
      <h2
        id="order-history-heading"
        className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted flex items-center gap-1.5"
      >
        <HistoryIcon size={13} className="shrink-0" /> {t('historyTitle')}
      </h2>
      <ol className="m-0 p-0 list-none flex flex-col">
        {rows.map((row, index) => {
          const latest = index === lastIndex;
          return (
            <li key={row.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'mt-1.5 size-2.5 shrink-0 rounded-full',
                    latest ? 'bg-accent-amber' : 'bg-bdr',
                  )}
                />
                {!latest && <span className="w-px flex-1 bg-bdr" />}
              </div>
              <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0', !latest && 'pb-3')}>
                <span className={cn('text-sm', latest ? 'text-ink-pri font-semibold' : 'text-ink-sec')}>
                  {row.label}
                </span>
                {row.carrier && (
                  <span className="px-1.5 py-px rounded-tb-pill border border-bdr text-[10px] font-semibold text-ink-muted">
                    {t('histCarrier')}
                  </span>
                )}
                <time dateTime={row.at} className="text-xs text-ink-muted">
                  {formatDateTime(row.at, lang)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
