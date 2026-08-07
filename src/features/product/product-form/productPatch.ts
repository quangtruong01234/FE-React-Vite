import isEqual from 'lodash/isEqual';
import type { ClearableProductField, CreateProductDto, UpdateProductDto } from '@/types';

/**
 * The backend validates `skuList` against the `variations` of the *same*
 * request, so one may never travel without the other: sending a new `skuList`
 * with the stored `variations` (or vice versa) is how a variant product loses
 * its rows.
 */
const VARIATION_PAIR = ['variations', 'skuList'] as const;

/**
 * The only fields `PATCH /products/:id` accepts `null` for (backend 2026-08-07).
 * Sending `null` for anything else is a hard 400, so an emptied non-clearable
 * field stays omitted — "leave unchanged" is all the endpoint offers there.
 */
const CLEARABLE_FIELDS = new Set<ClearableProductField>([
  'description',
  'sku',
  'brandId',
  'sellerNotes',
  'weight',
  'imageUrls',
]);

function isClearable(key: keyof CreateProductDto): key is ClearableProductField {
  return CLEARABLE_FIELDS.has(key as ClearableProductField);
}

/**
 * Reduces a full product payload to only the fields that differ from the saved
 * product.
 *
 * Backend 2026-08-02: PATCHing the whole form is what creates the lost-update
 * case — two tabs editing different fields, the slower save reverting the other
 * tab's unrelated change back to the value its form was hydrated with. Sending
 * only dirty fields removes it without any locking.
 *
 * A key whose next value is `undefined` means the seller emptied the input.
 * PATCH reads an absent key as "leave unchanged", so emptying is only
 * expressible for the six clearable fields, which take an explicit `null`
 * (backend 2026-08-07). Anything else emptied stays omitted.
 */
export function dirtyProductPatch(
  baseline: CreateProductDto,
  next: CreateProductDto,
): UpdateProductDto {
  const patch: Record<string, unknown> = {};

  const keys = new Set([...Object.keys(baseline), ...Object.keys(next)] as (keyof CreateProductDto)[]);
  for (const key of keys) {
    const nextValue = next[key];
    if (nextValue === undefined) {
      // Only worth clearing if the saved product actually holds a value.
      if (isClearable(key) && baseline[key] != null) patch[key] = null;
      continue;
    }
    if (!isEqual(baseline[key], nextValue)) {
      patch[key] = nextValue;
    }
  }

  // Keep the variation pair together whenever either half moved.
  if (VARIATION_PAIR.some(key => key in patch)) {
    for (const key of VARIATION_PAIR) {
      const nextValue = next[key];
      if (nextValue === undefined) delete patch[key];
      else patch[key] = nextValue;
    }
  }

  return patch as UpdateProductDto;
}
