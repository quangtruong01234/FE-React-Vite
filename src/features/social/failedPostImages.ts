/**
 * URLs already known to fail, shared across every `PostImage` instance.
 *
 * A single post image is rendered by more than one instance — the feed tile and
 * the lightbox are separate mounts asking for different derivative widths of the
 * same asset — so per-instance state alone lets a URL that already 404'd be
 * requested a second time when the user clicks it. Keyed by the raw `src`, not
 * the derivative, so every width is covered by one failure.
 *
 * Trade-off: a transient failure sticks for the rest of the SPA session (a
 * reload clears it). Acceptable here — the failure this guards against is a
 * deleted/never-uploaded asset, which does not come back on a retry.
 *
 * Lives in its own module rather than next to the component so that exporting it
 * does not cost `PostImage.tsx` a `react-refresh/only-export-components` warning.
 */
const failedPostImageUrls = new Set<string>();

export function hasPostImageFailed(src: string): boolean {
  return failedPostImageUrls.has(src);
}

export function markPostImageFailed(src: string): void {
  failedPostImageUrls.add(src);
}

/** Test-only — the set is module scope, so it leaks between cases otherwise. */
export function resetFailedPostImages(): void {
  failedPostImageUrls.clear();
}
