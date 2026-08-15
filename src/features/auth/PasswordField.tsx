import { useState, type ReactElement } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/format/utils';

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  error?: string;
  inputProps: UseFormRegisterReturn;
}

// Labeled password input with its own show/hide toggle (same suffix button
// pattern as the login TextField eye toggle). Shared by the register and
// reset-password forms.
export function PasswordField({ id, label, placeholder, error, inputProps }: PasswordFieldProps): ReactElement {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-body font-[500] text-[11px] leading-[1.4] text-tb-secondary tracking-[0.04em] uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="new-password"
          className={cn(
            'w-full h-11 bg-tb-elevated border rounded-tb-input pl-3.5 pr-11 text-white font-body text-[14px] outline-none placeholder:text-tb-muted transition-[border-color,box-shadow] duration-[120ms]',
            'focus:border-[rgba(245,158,11,0.5)] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.10)]',
            error ? 'border-tb-red focus:border-tb-red focus:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]' : 'border-tb-border',
          )}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent !border-none p-1 flex items-center cursor-pointer text-tb-secondary hover:text-white transition-colors"
        >
          {show ? <EyeOff size={18} className="shrink-0" /> : <Eye size={18} className="shrink-0" />}
        </button>
      </div>
      {error && <span className="text-xs text-tb-red">{error}</span>}
    </div>
  );
}
