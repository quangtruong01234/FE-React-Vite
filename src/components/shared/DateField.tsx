import { useEffect, useRef, useState, type ReactElement } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './IconButton';
import { cn } from '@/lib/format/utils';
import {
  WEEKDAY_LABELS,
  currentMonth,
  formatIsoDay,
  isDayInRange,
  monthGrid,
  monthOfIsoDay,
  monthTitle,
  shiftMonth,
  todayIso,
  type CalendarMonth,
} from '@/lib/date/calendar';

interface DateFieldProps {
  id?: string;
  /** Visible label above the trigger. `<button>` is labelable, so `htmlFor={id}` names it. */
  label?: string;
  /** Selected day as `YYYY-MM-DD`; `''` shows the placeholder. */
  value: string;
  onChange: (iso: string) => void;
  /** Inclusive selectable bounds as `YYYY-MM-DD`. */
  min?: string;
  max?: string;
  /**
   * Inclusive window to tint, so two fields driving one from/to range each show
   * the whole window instead of a single lonely day.
   */
  rangeFrom?: string;
  rangeTo?: string;
  hasError?: boolean;
  /** Trigger text while `value` is `''`. */
  placeholder?: string;
}

/**
 * Date picker in the app's own design language. The native `<input type="date">`
 * it replaced draws its calendar with browser chrome — no `tb-*` token reaches
 * it, it differs per browser, and automation (Chrome DevTools MCP / Playwright)
 * cannot drive its shadow-DOM segments, so any flow behind it is unverifiable.
 *
 * Keeps the `TextField` box metrics (`h-11`, `rounded-tb-input`,
 * `bg-canvas-elevated`) so it lines up with the text inputs beside it.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  rangeFrom,
  rangeTo,
  hasError = false,
  placeholder = 'Chọn ngày',
}: DateFieldProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarMonth>(() => monthOfIsoDay(value) ?? currentMonth());
  const ref = useRef<HTMLDivElement>(null);
  const today = todayIso();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function toggle(): void {
    // Reopening lands on the selected day's month, not wherever the seller
    // browsed to last time.
    if (!open) setView(monthOfIsoDay(value) ?? currentMonth());
    setOpen(o => !o);
  }

  function selectDay(iso: string): void {
    onChange(iso);
    setOpen(false);
  }

  function renderDay(iso: string | null, column: number): ReactElement {
    if (iso === null) return <span key={`blank-${column}`} aria-hidden="true" />;

    const selected = iso === value;
    const disabled = !isDayInRange(iso, min, max);
    const inWindow =
      !selected &&
      rangeFrom !== undefined &&
      rangeTo !== undefined &&
      iso >= rangeFrom &&
      iso <= rangeTo;

    return (
      <button
        key={iso}
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        aria-current={iso === today ? 'date' : undefined}
        onClick={() => selectDay(iso)}
        className={cn(
          'h-9 w-full p-0 grid place-items-center rounded-tb-ghost border border-transparent',
          'font-mono text-xs cursor-pointer transition-colors',
          !disabled && !selected && 'text-ink-pri hover:bg-canvas-elevated hover:border-tb-amber/40',
          inWindow && !disabled && 'bg-tb-amber/10 text-accent-amber',
          iso === today && !selected && 'border-tb-amber/50 text-accent-amber',
          // Amber→red gradient + glow: the same treatment every primary CTA gets.
          selected && 'bg-tb-gradient text-ink-pri font-semibold shadow-tb-cta border-transparent',
          disabled && 'text-tb-muted cursor-not-allowed hover:bg-transparent',
        )}
      >
        {Number(iso.slice(8, 10))}
      </button>
    );
  }

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={ref}>
      {label && (
        <label
          htmlFor={id}
          className="font-body font-medium text-[11px] leading-[1.4] text-ink-sec tracking-[0.04em] uppercase"
        >
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        // The `<label>` wins the accessible name, so the chosen day would never
        // be announced without pointing at it as the description.
        aria-describedby={id === undefined ? undefined : `${id}-value`}
        className={cn(
          'flex items-center gap-2 h-11 w-full px-3.5 bg-canvas-elevated border rounded-tb-input',
          'cursor-pointer text-left transition-[border-color,box-shadow] duration-[120ms]',
          // The repeated `hover:` is load-bearing: `index.css` paints every
          // hovered button's border opaque amber at a specificity a lone class
          // cannot beat, so without it the error state stopped reading as an
          // error exactly while the seller was pointing at the field.
          hasError
            ? 'border-accent-red hover:border-accent-red ring-4 ring-tb-red/10'
            : open
              ? 'border-tb-amber/50 hover:border-tb-amber/50 ring-4 ring-tb-amber/10'
              : 'border-bdr hover:border-tb-amber/40',
        )}
      >
        <CalendarDays size={15} className="shrink-0 text-ink-muted" />
        <span
          id={id === undefined ? undefined : `${id}-value`}
          className={cn('font-mono text-sm leading-[1.4]', value ? 'text-ink-pri' : 'text-ink-muted')}
        >
          {value ? formatIsoDay(value) : placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Chọn ngày — ${monthTitle(view)}`}
          className="absolute left-0 top-full mt-2 z-[120] w-80 p-3 bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card"
        >
          <div className="flex items-center justify-between mb-2">
            <IconButton
              aria-label="Tháng trước"
              onClick={() => setView(v => shiftMonth(v, -1))}
              className="size-8 rounded-tb-ghost text-ink-sec cursor-pointer hover:bg-canvas-elevated hover:text-ink-pri transition-colors"
            >
              <ChevronLeft size={16} className="shrink-0" />
            </IconButton>
            <span className="font-display text-sm font-semibold uppercase tracking-[0.04em] text-ink-pri">
              {monthTitle(view)}
            </span>
            <IconButton
              aria-label="Tháng sau"
              onClick={() => setView(v => shiftMonth(v, 1))}
              className="size-8 rounded-tb-ghost text-ink-sec cursor-pointer hover:bg-canvas-elevated hover:text-ink-pri transition-colors"
            >
              <ChevronRight size={16} className="shrink-0" />
            </IconButton>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map(day => (
              <span
                key={day}
                className="h-6 grid place-items-center font-body font-medium text-[10px] uppercase text-ink-muted tracking-[0.04em]"
              >
                {day}
              </span>
            ))}
          </div>

          {monthGrid(view).map((week, row) => (
            <div key={row} className="grid grid-cols-7 gap-1">
              {week.map(renderDay)}
            </div>
          ))}

          <button
            type="button"
            onClick={() => selectDay(today)}
            disabled={!isDayInRange(today, min, max)}
            className={cn(
              'mt-2 w-full h-8 rounded-tb-ghost border border-bdr bg-canvas-elevated',
              'font-body text-xs text-ink-sec cursor-pointer transition-colors',
              'hover:border-tb-amber/40 hover:text-ink-pri',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-bdr',
            )}
          >
            Hôm nay
          </button>
        </div>
      )}
    </div>
  );
}
