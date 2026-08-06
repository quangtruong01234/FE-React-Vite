import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { cldImage } from '@/lib/http/cloudinaryUrl';

interface ProductThumbProps {
  /** Image URL. When empty/null a placeholder icon renders instead of `<img src="">`. */
  src?: string | null;
  alt: string;
  /** Sizing / rounding / border classes for the container. */
  className?: string;
  /** Fallback icon size (number, per icon rules). */
  iconSize?: number;
  loading?: 'lazy' | 'eager';
  /** When set, the thumbnail becomes a link to this route. */
  to?: string;
  /**
   * Cloudinary delivery width in device px. The default covers the row slots
   * (≤ 80 CSS px at 2×); raise it wherever the slot is bigger, or the thumbnail
   * renders soft on a high-DPR screen.
   */
  width?: number;
}

/**
 * Product image thumbnail with a guaranteed fallback — never emits `<img src="">`.
 * Shared across cart, checkout, order and social product rows so the empty-image
 * placeholder stays consistent (P2-02).
 */
export function ProductThumb({
  src,
  alt,
  className,
  iconSize = 20,
  loading = 'lazy',
  to,
  width = 160,
}: ProductThumbProps): ReactElement {
  const containerCls = cn(
    'bg-canvas-elevated grid place-items-center overflow-hidden shrink-0',
    className,
  );
  const content = src ? (
    <img
      src={cldImage(src, width)}
      alt={alt}
      loading={loading}
      className="w-full h-full object-cover"
    />
  ) : (
    <Package size={iconSize} className="text-ink-muted shrink-0" />
  );

  if (to) {
    return (
      <Link to={to} className={containerCls}>
        {content}
      </Link>
    );
  }
  return <div className={containerCls}>{content}</div>;
}
