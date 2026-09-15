import { type ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/format/utils';

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  /** Visible label above the control. Omit for a bare control and pass `ariaLabel`. */
  label?: string;
  /** Names the control when there is no visible `label` (table cells). */
  ariaLabel?: string;
  /** Disabled first option, shown while `value` is `''`. Omit when a value is always selected. */
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  /** `md` is the form default; `sm` fits inline in a table row. */
  size?: 'md' | 'sm';
}

/**
 * The app's tb-styled native `<select>`. Native keeps it accessible and avoids a
 * Radix portal inside a dialog; `src/components/ui/select.tsx` has no consumers.
 *
 * Extracted from `features/address/AddressSelect` when the admin users table
 * needed the same control (ROLE-ADMIN-01) — two copies of this markup would have
 * been the DRY violation core.md forbids.
 */
export function SelectField({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  placeholder,
  disabled,
  loading,
  size = 'md',
}: SelectFieldProps): ReactElement {
  const control = (
    <div className="relative">
      <select
        value={value}
        aria-label={ariaLabel}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full appearance-none bg-canvas-base border border-bdr rounded-tb-input',
          'text-ink-pri outline-none cursor-pointer',
          // `tb-amber`, not `accent-amber`: the alias is a `var()` so Tailwind
          // drops the `/50` class entirely (measured in the built CSS) and the
          // control gets no visible focus border. Same hex, #F59E0B.
          'focus:border-tb-amber/50 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          size === 'md' ? 'pl-3.5 pr-9 py-2.5 text-sm' : 'font-body pl-2.5 pr-7 py-1 text-xs',
          value === '' && 'text-ink-muted',
        )}
      >
        {placeholder !== undefined && (
          <option value="" disabled className="text-ink-muted bg-canvas-base">
            {loading ? 'Đang tải…' : placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-ink-pri bg-canvas-base">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={size === 'md' ? 16 : 14}
        className={cn(
          'shrink-0 absolute top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none',
          size === 'md' ? 'right-3' : 'right-2',
        )}
      />
    </div>
  );

  if (label === undefined) return control;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body font-medium text-[11px] text-ink-muted tracking-[0.04em] uppercase">
        {label}
      </label>
      {control}
    </div>
  );
}
