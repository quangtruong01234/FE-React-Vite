import { type ReactElement } from 'react';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

type PriceSize = 'sm' | 'md' | 'lg';

interface PriceTextProps {
  price: number;
  className?: string;
  size?: PriceSize;
}

const sizeClasses: Record<PriceSize, string> = {
  sm: 'text-base',
  md: 'text-[22px]',
  lg: 'text-[28px] font-black',
};

export function PriceText({ price, className, size = 'md' }: PriceTextProps): ReactElement {
  return (
    <span className={cn('font-mono font-bold leading-none bg-tb-gradient-90 bg-clip-text text-transparent', sizeClasses[size], className)}>
      {formatPrice(price)}
    </span>
  );
}
