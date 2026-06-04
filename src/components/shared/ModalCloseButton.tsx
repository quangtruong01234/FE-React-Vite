import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalCloseButtonProps {
  onClick: () => void;
  className?: string;
}

export function ModalCloseButton({ onClick, className }: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'size-8 grid place-items-center rounded-full p-0',
        'hover:bg-canvas-elevated text-ink-sec transition-colors',
        'border-0 bg-transparent cursor-pointer shrink-0',
        className,
      )}
    >
      <X size={15} className="shrink-0" />
    </button>
  );
}
