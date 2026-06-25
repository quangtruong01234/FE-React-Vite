import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  readOnly?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
}

export function StarRating({ rating, readOnly = true, onChange, size = 'md' }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          className={cn(
            'font-body leading-none transition-colors',
            size === 'sm' ? 'text-sm' : 'text-base',
            readOnly ? 'cursor-default' : 'cursor-pointer',
            star <= rating ? 'text-accent-amber' : 'text-ink-muted',
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
