import { type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ButtonSize = 'sm' | 'md' | 'lg';

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: ButtonSize;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-2.5 px-4 text-[13px]',
  md: 'py-3.5 px-5 text-sm',
  lg: 'py-4 px-7 text-base',
};

export function GradientButton({
  children,
  onClick,
  disabled,
  className,
  type = 'button',
  size = 'md',
}: GradientButtonProps): ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'bg-tb-gradient text-white border-0 rounded-tb-cta cursor-pointer',
        'font-display font-black uppercase tracking-widest',
        'hover:opacity-90 active:scale-[0.98] transition-all duration-100',
        'shadow-tb-cta disabled:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </button>
  );
}
