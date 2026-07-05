import { cn } from '@/lib/format/utils';
import { ORDER_STATUS_META } from '@/lib/domain/orderStatus';
import type { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, badgeClass } = ORDER_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
        badgeClass,
      )}
    >
      {label}
    </span>
  );
}
