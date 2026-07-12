import { type ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/format/utils';

export interface AddressSelectOption {
  value: string;
  label: string;
}

interface AddressSelectProps {
  label: string;
  value: string;
  options: AddressSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * A tb-styled native `<select>` for the cascading province/district/ward
 * dropdowns. Native keeps it accessible and avoids the Radix portal inside the
 * address dialog; the app has no other dropdown pattern to reuse.
 */
export function AddressSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
  loading,
}: AddressSelectProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          disabled={disabled || loading}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none bg-canvas-base border border-bdr rounded-tb-input',
            'pl-3.5 pr-9 py-2.5 text-sm text-ink-pri outline-none cursor-pointer',
            'focus:border-accent-amber/50 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            value === '' && 'text-ink-muted',
          )}
        >
          <option value="" disabled className="text-ink-muted bg-canvas-base">
            {loading ? 'Đang tải…' : placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-ink-pri bg-canvas-base">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="shrink-0 absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
        />
      </div>
    </div>
  );
}
