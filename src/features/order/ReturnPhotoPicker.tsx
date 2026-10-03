import { useRef, type ChangeEvent, type ReactElement } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { cldImage } from '@/lib/http/cloudinaryUrl';
import { cn } from '@/lib/format/utils';
import { useT } from '@/hooks/ui/useT';
import { orderMessages } from './order.i18n';
import { MAX_RETURN_PHOTOS, RETURN_PHOTO_ACCEPT } from './returnRequest';
import type { ReturnPhotosState } from './useReturnPhotos';

interface ReturnPhotoPickerProps {
  state: ReturnPhotosState;
  disabled?: boolean;
}

/** RETURN-PHOTO-01: up to 5 optional evidence photos on the return form. */
export function ReturnPhotoPicker({ state, disabled = false }: ReturnPhotoPickerProps): ReactElement {
  const t = useT(orderMessages);
  const inputRef = useRef<HTMLInputElement>(null);
  const { photos, uploading, error, addFiles, remove } = state;

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    // Reset so picking the same file again after removing it still fires.
    e.target.value = '';
    void addFiles(files);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-body text-sm text-ink-sec">{t('returnPhotos')}</span>
        <span className="font-body text-xs text-ink-muted">{photos.length}/{MAX_RETURN_PHOTOS}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {photos.map((photo, i) => (
          <div key={photo.publicId} className="relative aspect-square rounded-tb-card overflow-hidden bg-canvas-elevated">
            <img
              src={cldImage(photo.url, 200)}
              alt={t('returnPhotoAlt', { n: i + 1 })}
              className="w-full h-full object-cover"
            />
            <IconButton
              onClick={() => remove(i)}
              disabled={disabled}
              aria-label={t('removeReturnPhoto', { n: i + 1 })}
              className="absolute top-1 right-1 size-5 rounded-full bg-scrim/60 disabled:cursor-not-allowed"
            >
              <X size={10} className="shrink-0 text-ink-on-accent" />
            </IconButton>
          </div>
        ))}
        {photos.length < MAX_RETURN_PHOTOS && (
          <button
            type="button"
            disabled={disabled || uploading}
            aria-label={uploading ? t('returnPhotoUploading') : t('addReturnPhoto')}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'aspect-square rounded-tb-card border-2 border-dashed border-bdr',
              'grid place-items-center transition-colors',
              'hover:border-tb-amber/50 hover:bg-tb-amber/5',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {uploading ? (
              <Loader2 size={18} className="shrink-0 text-ink-muted animate-spin" />
            ) : (
              <ImagePlus size={18} className="shrink-0 text-ink-muted" />
            )}
          </button>
        )}
      </div>
      {error && <p className="m-0 font-body text-xs text-accent-red">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={RETURN_PHOTO_ACCEPT}
        multiple
        className="hidden"
        data-testid="return-photo-input"
        onChange={handleChange}
      />
    </div>
  );
}
