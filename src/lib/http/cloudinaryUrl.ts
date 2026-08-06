/**
 * Cloudinary delivery-URL transforms (the read side of `cloudinary.ts`).
 *
 * Uploads persist the raw `secure_url` — the *original* asset, often a
 * multi-megabyte 3000×3000 JPEG. Rendering that straight into a 44px avatar or
 * a 400px product card ships 10–100× the bytes actually needed. Inserting a
 * transformation segment after `/upload/` makes Cloudinary deliver a resized,
 * auto-format (WebP/AVIF) and auto-quality derivative instead.
 *
 * `c_limit` only ever downscales and preserves the aspect ratio, so the
 * existing `object-cover` / `object-contain` classes keep framing the image.
 */

/** `https://res.cloudinary.com/<cloud>/image/upload/<rest>` */
const IMAGE_DELIVERY = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * One transformation parameter — `f_auto`, `w_400`, `e_blur:200`, …
 *
 * The value may not contain a `.`, so a root-level public id that happens to
 * look like a parameter (`ab_cd.jpg`) is not mistaken for a transformation and
 * silently left unoptimised. The cost is that a caller-supplied decimal
 * parameter (`ar_1.5`) reads as "no transformation" and gets ours prepended —
 * Cloudinary then chains the two segments, which still renders correctly.
 */
const TRANSFORM_PARAM = /^[a-z]{1,3}_[^/,.]+$/;

/**
 * Whether the path after `/upload/` already starts with a transformation
 * segment. A version (`v1712345678`) or a public-id folder is not one.
 */
function hasTransform(rest: string): boolean {
  const first = rest.split('/')[0];
  if (/^v\d+$/.test(first)) return false;
  return first.split(',').every(param => TRANSFORM_PARAM.test(param));
}

/**
 * Request a width-capped, auto-format, auto-quality derivative of a Cloudinary
 * image. `width` is the largest CSS width the image renders at, times the DPR
 * you want to serve (so a 44px avatar on a 2× screen passes ~96).
 *
 * Anything that is not a plain Cloudinary *image* delivery URL — an Unsplash
 * fallback, a `blob:` upload preview, a video, or a URL that already carries a
 * transformation — is returned untouched.
 */
export function cldImage(url: string, width: number): string {
  const match = IMAGE_DELIVERY.exec(url);
  if (!match) return url;
  const [, prefix, rest] = match;
  if (hasTransform(rest)) return url;
  return `${prefix}f_auto,q_auto,w_${width},c_limit/${rest}`;
}
