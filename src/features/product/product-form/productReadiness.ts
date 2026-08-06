import type { FormFields } from './useProductForm';

/**
 * The subset of form fields that gate submission. SKU is deliberately excluded:
 * it is optional (the backend auto-provisions `PROD-<id>` when omitted), so it
 * gates neither readiness nor the missing-fields summary — see `productSku.ts`.
 */
type ReadinessFields = Pick<
  FormFields,
  'name' | 'categoryIds' | 'hasVariations' | 'singlePrice'
>;

/**
 * Human-readable list of still-missing required fields, in display order.
 * Empty when the form is ready to submit.
 */
export function missingFields(fields: ReadinessFields): string[] {
  const priceMissing =
    !fields.hasVariations &&
    (!fields.singlePrice || Number(fields.singlePrice) <= 0);

  return [
    !fields.name.trim() && 'tên',
    fields.categoryIds.length === 0 && 'danh mục',
    priceMissing && 'giá',
  ].filter((x): x is string => typeof x === 'string');
}

/** A form is ready to submit once nothing required is missing. */
export function isFormReady(fields: ReadinessFields): boolean {
  return missingFields(fields).length === 0;
}
