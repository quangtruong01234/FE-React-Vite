/**
 * Normalizes the seller-entered base SKU for the create/update payload.
 *
 * SKU is optional: the backend auto-provisions a fallback SKU (`PROD-<productId>`)
 * for base-price products when it is omitted, and SKU-matrix products manage their
 * SKUs per row. A blank/whitespace-only field therefore resolves to `undefined`
 * (omit the field) instead of sending a placeholder like `"DRAFT"`; a typed value
 * is trimmed and preserved verbatim.
 */
export function skuForPayload(raw: string): string | undefined {
  return raw.trim() || undefined;
}

/**
 * Normalizes a persisted product SKU into a controlled-input value.
 *
 * The column is nullable (blank on create, or the codes live on `skus[]`), so the
 * edit form must not feed `null` into the text field — that both breaks the
 * controlled input and reaches `skuForPayload`, which calls `.trim()`.
 */
export function skuForField(stored: string | null | undefined): string {
  return stored ?? '';
}
