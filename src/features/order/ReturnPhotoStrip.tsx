import type { ReactElement } from 'react';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { cn } from '@/lib/format/utils';
import { useT } from '@/hooks/ui/useT';
import { orderMessages } from './order.i18n';

/**
 * RETURN-PHOTO-01: the buyer's evidence photos on a submitted request. Renders
 * nothing for a text-only request or a pre-rollout response without the field.
 */
export function ReturnPhotoStrip({ urls, className }: { urls?: string[]; className?: string }): ReactElement | null {
  const t = useT(orderMessages);
  if (!urls?.length) return null;
  return (
    <ul className={cn('m-0 p-0 list-none flex flex-wrap gap-2', className)}>
      {urls.map((url, i) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block size-16 rounded-tb-card overflow-hidden border border-bdr bg-canvas-elevated hover:border-accent-amber transition-colors"
          >
            <img
              src={cldImage(url, 160)}
              alt={t('returnPhotoAlt', { n: i + 1 })}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
