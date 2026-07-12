import { type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/format/utils';

interface TextFieldProps {
  id?: string;
  name?: string;
  label?: string;
  type?: 'text' | 'password' | 'email';
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  leftIcon?: ReactNode;
  suffix?: ReactNode;
  hasError?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}

export function TextField({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  leftIcon,
  suffix,
  hasError = false,
  autoFocus,
  autoComplete,
}: TextFieldProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="font-body font-medium text-[11px] leading-[1.4] text-ink-sec tracking-[0.04em] uppercase"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'relative flex items-center h-11 bg-canvas-elevated border rounded-tb-input',
          'transition-[border-color,box-shadow] duration-[120ms]',
          'focus-within:border-tb-amber/50 focus-within:ring-4 focus-within:ring-tb-amber/10',
          hasError
            ? 'border-accent-red focus-within:border-accent-red focus-within:ring-tb-red/10'
            : 'border-bdr'
        )}
      >
        {leftIcon && (
          <span className="pl-3 text-ink-muted flex items-center shrink-0">
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent border-none outline-none py-3 px-3.5 text-ink-pri font-body font-normal text-sm leading-[1.4] placeholder:text-ink-muted"
        />
        {suffix && (
          <span className="pr-2.5 text-ink-sec flex items-center shrink-0">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
