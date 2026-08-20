/**
 * Seller shop-page product search: matches on name or base SKU, case-insensitive.
 *
 * `sku` is nullable (blank on create, or the codes live on `skus[]`), so the
 * predicate must never call string methods on it unguarded — a single product
 * without a SKU used to throw and blank the whole shop page on the first keystroke.
 */
export function filterProductsByQuery<
  T extends { name: string; sku: string | null },
>(products: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q),
  );
}
