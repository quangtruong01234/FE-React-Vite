import { type ReactElement } from 'react';
import { cn } from '@/lib/format/utils';

interface LiveBadgeProps {
  className?: string;
}

export function LiveBadge({ className }: LiveBadgeProps): ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-tb-pill',
        'bg-tb-red text-white font-display font-black uppercase tracking-[0.08em] text-[11px]',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0 [animation:tb-pulse_1.4s_ease-in-out_infinite]" />
      LIVE
    </span>
  );
}
