export interface SequentialUploadCallbacks<T> {
  /** Upload a single file. `onProgress` reports that file's own 0–100 percent. */
  upload: (file: File, index: number, onProgress: (percent: number) => void) => Promise<T>;
  /** Commit one successfully-uploaded item immediately, as soon as it resolves. */
  onItem: (item: T) => void;
  /** Optional aggregate progress across the whole batch (0–100). */
  onProgress?: (percent: number) => void;
}

/**
 * Upload files one at a time, committing each result via `onItem` the moment it
 * resolves — never batching the commit until the end.
 *
 * This is the fix for UP-01: the previous per-feature loops accumulated results
 * in a local array and only wrote them to state after *every* file succeeded, so
 * a mid-batch failure stranded the already-uploaded assets. Because they never
 * entered component state, the cancel/remove paths couldn't `deleteMedia` them —
 * the user lost the images and orphaned Cloudinary assets piled up. Committing
 * per file keeps every successful upload visible and cleanable even when a later
 * file throws. The error is rethrown so the caller can surface it.
 */
export async function uploadFilesSequential<T>(
  files: File[],
  { upload, onItem, onProgress }: SequentialUploadCallbacks<T>,
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    const item = await upload(files[i], i, (p) => {
      const base = (i / files.length) * 100;
      onProgress?.(Math.round(base + p / files.length));
    });
    onItem(item);
  }
}
