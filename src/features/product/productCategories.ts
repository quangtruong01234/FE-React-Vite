import type { Product } from '@/types';

/**
 * Resolves a product's category names for display. Every product read now returns
 * the full `categories[]` (P1-04); falls back to the single hydrated `category`
 * for any older shape, then to an empty list. Pure — unit-tested.
 */
export function productCategoryNames(
  product: Pick<Product, 'categories' | 'category'>,
): string[] {
  if (product.categories && product.categories.length > 0) {
    return product.categories.map((c) => c.name);
  }
  if (product.category) return [product.category.name];
  return [];
}
