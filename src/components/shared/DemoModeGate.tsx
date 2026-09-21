import { type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/format/utils';
import { DEMO_DISABLED_LABEL, isDemoMode } from '@/lib/demo/backendStatus';

interface DemoModeGateProps {
  children: ReactNode;
  /** Layout classes for the wrapper — pass the ones the child had (`flex-1`, …). */
  className?: string;
}

/**
 * Wraps a control whose real behaviour needs a live backend.
 *
 * Online it renders the child untouched, so the normal path carries no extra
 * markup. In demo mode it dims the child, covers it with a focusable overlay
 * that swallows the click, and explains why on hover or keyboard focus.
 *
 * The overlay is a real `<button>` rather than `pointer-events-none` alone:
 * a dimmed control that silently ignores clicks reads as a bug, and a keyboard
 * user needs something focusable to reach the explanation. Tooltip is CSS-only
 * (`group-hover` / `group-focus-within`) — `ui/tooltip.tsx` would drag in a
 * Radix provider for one static string.
 */
export function DemoModeGate({ children, className }: DemoModeGateProps): ReactElement {
  if (!isDemoMode()) return <>{children}</>;

  return (
    <span className={cn('group relative inline-flex', className)}>
      <span className="pointer-events-none inline-flex w-full opacity-60">{children}</span>
      <button
        type="button"
        aria-label={DEMO_DISABLED_LABEL}
        className="absolute inset-0 cursor-not-allowed rounded-xl"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-tb-input border border-bdr bg-canvas-elevated px-3 py-1.5 font-body text-xs text-ink-sec opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {DEMO_DISABLED_LABEL}
      </span>
    </span>
  );
}
