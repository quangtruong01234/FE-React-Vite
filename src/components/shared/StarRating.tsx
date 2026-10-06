import { cn } from '@/lib/format/utils';
import { useT } from '@/hooks/ui/useT';
import { sharedMessages } from './shared.i18n';

interface StarRatingProps {
  rating: number;
  readOnly?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
}

const STARS = [1, 2, 3, 4, 5];

/**
 * A read-only rating is one image ("4 out of 5 stars"), not five disabled buttons a screen
 * reader reads as "★, dimmed" five times. An editable one is five buttons, each named for
 * the rating it sets, with the current one pressed.
 */
export function StarRating({ rating, readOnly = true, onChange, size = 'md' }: StarRatingProps) {
  const t = useT(sharedMessages);
  const starClass = (star: number): string =>
    cn(
      'font-body leading-none transition-colors',
      size === 'sm' ? 'text-sm' : 'text-base',
      star <= rating ? 'text-accent-amber' : 'text-ink-muted',
    );

  if (readOnly) {
    return (
      <div role="img" aria-label={t('ratingOf', { rating })} className="flex items-center gap-0.5">
        {STARS.map((star) => (
          <span key={star} aria-hidden="true" className={starClass(star)}>
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          aria-label={t('rateStars', { count: star })}
          aria-pressed={star === rating}
          className={cn(starClass(star), 'cursor-pointer')}
        >
          ★
        </button>
      ))}
    </div>
  );
}
