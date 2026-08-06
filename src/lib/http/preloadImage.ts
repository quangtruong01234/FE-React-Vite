/**
 * Warm the HTTP cache for an image the user is about to need.
 *
 * Grid thumbnails and their full-size counterpart request different Cloudinary
 * derivatives (`w_600` vs `w_1600`), so opening a lightbox or switching a
 * gallery hero is a fresh network round-trip. Calling this on hover — the
 * intent signal that precedes the click — makes that round-trip start early
 * instead of after the click.
 *
 * Returns the element so callers can be tested; the browser keeps the request
 * alive without it being attached to the DOM.
 */
export function preloadImage(url: string): HTMLImageElement | null {
  if (url.length === 0 || typeof Image === 'undefined') return null;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  return img;
}
