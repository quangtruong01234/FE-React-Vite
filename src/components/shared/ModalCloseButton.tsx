import { X } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { IconButton } from './IconButton';

interface ModalCloseButtonProps {
  onClick: () => void;
  className?: string;
  /** Override when a screen reader needs to know *which* dialog closes. */
  label?: string;
}

export function ModalCloseButton({ onClick, className, label = 'Đóng' }: ModalCloseButtonProps) {
  return (
    <IconButton
      onClick={onClick}
      aria-label={label}
      className={cn(
        'size-8 rounded-full border-0 bg-transparent cursor-pointer shrink-0',
        'hover:bg-canvas-elevated text-ink-sec transition-colors',
        className,
      )}
    >
      <X size={15} className="shrink-0" />
    </IconButton>
  );
}
