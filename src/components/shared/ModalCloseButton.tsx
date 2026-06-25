import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

interface ModalCloseButtonProps {
  onClick: () => void;
  className?: string;
}

export function ModalCloseButton({ onClick, className }: ModalCloseButtonProps) {
  return (
    <IconButton
      onClick={onClick}
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
