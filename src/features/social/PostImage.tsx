import { useState, type ReactElement } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { hasPostImageFailed, markPostImageFailed } from './failedPostImages';

interface PostImageProps {
  /** Raw image URL from the post; the Cloudinary derivative is built here. */
  src: string;
  /** Cloudinary delivery width in device px — pick it from the slot the image fills. */
  width: number;
  /**
   * Classes for the image box; the placeholder reuses them, so a fill class
   * (`w-full h-full`, `aspect-*`) makes it fill the slot while a `max-w-*`
   * contain class lets it shrink-wrap the icon inside the parent's reserved box.
   */
  className?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'auto';
  onClick?: (e: React.MouseEvent) => void;
  /** Placeholder icon size (number, per icon rules). */
  iconSize?: number;
}

/**
 * Post image with a guaranteed fallback — a URL that 404s renders a placeholder
 * instead of a broken image plus a console error.
 *
 * Not hypothetical: seeded/legacy post rows point at Cloudinary assets that were
 * never uploaded (snapshot §"Chờ backend"), and the feed is a happy path, so the
 * failure is visible on first load. Same contract as `ProductThumb` for product
 * rows; this one is post-shaped (decorative `alt`, caller-owned box classes).
 */
export function PostImage({
  src,
  width,
  className,
  loading,
  fetchPriority,
  onClick,
  iconSize = 32,
}: PostImageProps): ReactElement {
  // Keyed by the URL that failed, not a boolean: a feed slot that recycles into a
  // new post must retry the new image instead of inheriting the old one's failure.
  // The local state only exists to re-render this instance; the shared set is what
  // decides, so a slot mounting onto an already-failed URL skips the request too.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src === failedSrc || hasPostImageFailed(src)) {
    return (
      <div
        className={cn('bg-canvas-elevated grid place-items-center p-6', className)}
        onClick={onClick}
      >
        <ImageOff size={iconSize} className="text-ink-muted shrink-0" />
      </div>
    );
  }

  return (
    <img
      src={cldImage(src, width)}
      alt=""
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      onClick={onClick}
      onError={() => {
        markPostImageFailed(src);
        setFailedSrc(src);
      }}
    />
  );
}
