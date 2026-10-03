import { type ReactElement } from 'react';
import { cn } from '@/lib/format/utils';
import { useT } from '@/hooks/ui/useT';
import { sharedMessages } from './shared.i18n';

interface OnlinePillProps {
  count: number;
  className?: string;
}

export function OnlinePill({ count, className }: OnlinePillProps): ReactElement {
  const t = useT(sharedMessages);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-xs font-medium',
        'bg-[var(--tb-online-soft)] border border-[color:var(--tb-online-bd)] text-[color:var(--tb-online-tx)]',
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[var(--tb-online)] [animation:tb-pulse_1.6s_ease-in-out_infinite]" />
      {t('online', { count })}
    </span>
  );
}
