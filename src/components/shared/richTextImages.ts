export interface TrackedImage {
  url: string;
  publicId: string;
}

/**
 * UP-03: images inserted into the RichTextEditor this session are tracked with
 * their Cloudinary `publicId`. When the editor's HTML no longer references a
 * tracked image (the user deleted it, or cleared the editor), its asset is now
 * orphaned and must be cleaned up.
 *
 * Pure split of the tracked list against the current editor HTML:
 * - `kept`    — images still referenced in the HTML (stay tracked).
 * - `removed` — images no longer in the HTML (their `publicId` should be
 *               `deleteMedia`'d).
 *
 * Only session-uploaded images are ever passed in `tracked`, so pre-existing
 * (persisted) images embedded in `value` are never touched.
 */
export function partitionEditorImages(
  tracked: TrackedImage[],
  html: string,
): { kept: TrackedImage[]; removed: TrackedImage[] } {
  const kept: TrackedImage[] = [];
  const removed: TrackedImage[] = [];
  for (const img of tracked) {
    if (html.includes(img.url)) kept.push(img);
    else removed.push(img);
  }
  return { kept, removed };
}
