import { useRef, useState } from 'react';
import { uploadReturnPhoto, deleteMedia } from '@/lib/http/cloudinary';
import { uploadFilesSequential } from '@/lib/http/uploadSequential';
import { capImageBatch } from '@/lib/http/uploadValidation';
import { useLanguage } from '@/context/useLanguage';
import { bindTranslator } from '@/lib/i18n/messages';
import { uploadMessages } from '@/lib/http/upload.i18n';
import { MAX_RETURN_PHOTOS, returnPhotoError } from './returnRequest';

export interface ReturnPhoto {
  url: string;
  publicId: string;
}

export interface ReturnPhotosState {
  photos: ReturnPhoto[];
  uploading: boolean;
  error: string | null;
  addFiles: (files: File[]) => Promise<void>;
  remove: (index: number) => void;
  /** Close without submitting — the uploads are orphans, so delete them. */
  discard: () => void;
  /** After a successful submit — the request now owns the photos, keep them. */
  reset: () => void;
}

/**
 * RETURN-PHOTO-01: evidence photos for a return request, uploaded to Cloudinary
 * before the request is sent (the request carries only their URLs). Follows the
 * product form's upload idiom — capped batch, pre-upload validation, and a
 * per-file commit (UP-01) so a mid-batch failure never strands an upload the
 * remove/discard paths cannot clean up.
 */
export function useReturnPhotos(userId: string): ReturnPhotosState {
  const { lang } = useLanguage();
  const [photos, setPhotos] = useState<ReturnPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Freshest list for the cap and the cleanup paths, which can run mid-upload.
  const photosRef = useRef<ReturnPhoto[]>([]);

  function commit(next: ReturnPhoto[]): void {
    photosRef.current = next;
    setPhotos(next);
  }

  async function addFiles(files: File[]): Promise<void> {
    if (!files.length) return;
    const { accepted, notice } = capImageBatch(photosRef.current.length, files, MAX_RETURN_PHOTOS, lang);
    const invalid = accepted.map((file) => returnPhotoError(file, lang)).find((msg) => msg !== null);
    if (!accepted.length || invalid) {
      setError(invalid ?? notice);
      return;
    }
    setError(notice);
    setUploading(true);
    try {
      await uploadFilesSequential(accepted, {
        upload: (file, _i, onProgress) => uploadReturnPhoto(file, userId, onProgress, lang),
        onItem: ({ url, publicId }) => commit([...photosRef.current, { url, publicId }]),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : bindTranslator(uploadMessages, lang)('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number): void {
    const photo = photosRef.current[index];
    if (photo) void deleteMedia(photo.publicId);
    commit(photosRef.current.filter((_, i) => i !== index));
    setError(null);
  }

  function discard(): void {
    photosRef.current.forEach((photo) => { void deleteMedia(photo.publicId); });
    reset();
  }

  function reset(): void {
    commit([]);
    setError(null);
  }

  return { photos, uploading, error, addFiles, remove, discard, reset };
}
