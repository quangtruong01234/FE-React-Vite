import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { parseShippingAddress, formatAddressLines } from './shippingAddress';

/** Renders a pipe-delimited GHN shipping address as a readable block
 *  (name + phone on top, the address lines below). Falls back to the raw
 *  string when it isn't the expected 6-part format. */
export function ShippingAddressBlock({
  raw,
  className,
}: {
  raw: string;
  className?: string;
}): ReactElement {
  const parsed = parseShippingAddress(raw);
  if (!parsed) {
    return <div className={cn('text-sm text-white leading-relaxed', className)}>{raw}</div>;
  }
  return (
    <div className={cn('text-sm text-white leading-relaxed', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold">{parsed.name}</span>
        {parsed.phone && <span className="font-mono text-xs text-ink-sec">{parsed.phone}</span>}
      </div>
      <div className="text-ink-sec">{formatAddressLines(parsed)}</div>
    </div>
  );
}
