import { nonBlank } from '@/lib/format/user';

/** The one image field every product read carries. */
export interface ProductImageSource {
  imageUrls?: readonly string[] | null;
}

/**
 * Cover image of a product: the first non-blank entry of `imageUrls`, or
 * `null` when it has none (callers render a placeholder).
 *
 * The backend product entity has **no** singular `imageUrl` — only
 * `imageUrls: string[] | null` (IMG-FIELD-01). Reading a phantom `imageUrl`
 * left the "Đang hot" rail, the seller's `/shop` table and the post product
 * chip on the placeholder icon for every product, so every product thumbnail
 * goes through here instead of picking a field by hand.
 */
export function productCoverImage(
  product: ProductImageSource | null | undefined,
): string | null {
  for (const url of product?.imageUrls ?? []) {
    const image = nonBlank(url);
    if (image) return image;
  }
  return null;
}
