import { type ChangeEvent, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col gap-[6px] w-full">
      {label && (
        <label
          htmlFor={id}
          className="font-body font-[500] text-[11px] leading-[1.4] text-[#A1A1AA] tracking-[0.04em] uppercase"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'relative flex items-center h-[44px] bg-[#1C1C1E] border rounded-[10px]',
          'transition-[border-color,box-shadow] duration-[120ms]',
          'focus-within:border-[rgba(245,158,11,0.5)] focus-within:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
          hasError
            ? 'border-[#EF4444] focus-within:border-[#EF4444] focus-within:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]'
            : 'border-[#27272A]'
        )}
      >
        {leftIcon && (
          <span className="pl-[12px] text-[#52525B] flex items-center flex-shrink-0">
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
          className="flex-1 bg-transparent border-none outline-none py-[12px] px-[14px] text-white font-body font-normal text-[14px] leading-[1.4] placeholder:text-[#52525B]"
        />
        {suffix && (
          <span className="pr-[10px] text-[#A1A1AA] flex items-center flex-shrink-0">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
