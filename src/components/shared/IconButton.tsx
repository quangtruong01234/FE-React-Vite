import { type ReactElement, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function IconButton({
  className,
  type = 'button',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>): ReactElement {
  return (
    <button
      type={type}
      className={cn('p-0 grid place-items-center', className)}
      {...props}
    >
      {children}
    </button>
  );
}
