import { type ReactElement, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/format/utils';

/**
 * An icon-only button has no text node, so without one of these attributes a
 * screen reader announces it as just "button" — 16 of the 28 call sites were in
 * that state before AUD-0816-03. Requiring the name in the *type* is what keeps
 * it from happening again: a new unnamed icon button is now a `tsc` error, not a
 * defect nobody sees. `title` counts (browsers expose it as the accessible name)
 * and is what the editor toolbars already use for their tooltips.
 */
type AccessibleName =
  | { 'aria-label': string }
  | { 'aria-labelledby': string }
  | { title: string };

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & AccessibleName;

export function IconButton({
  className,
  type = 'button',
  children,
  ...props
}: IconButtonProps): ReactElement {
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
