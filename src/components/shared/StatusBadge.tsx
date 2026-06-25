import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

interface StatusBadgeProps {
  status: OrderStatus;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending:    { label: 'Chờ xác nhận', className: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  confirmed:  { label: 'Đã xác nhận',  className: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20' },
  processing: { label: 'Đang xử lý',   className: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20' },
  shipped:    { label: 'Đang vận chuyển', className: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' },
  delivering: { label: 'Đang giao',    className: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' },
  completed:  { label: 'Hoàn thành',   className: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  canceled:   { label: 'Đã hủy',       className: 'bg-accent-red/10 text-accent-red border-accent-red/20' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-body font-medium rounded-tb-pill border',
        className,
      )}
    >
      {label}
    </span>
  );
}
