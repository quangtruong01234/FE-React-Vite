import isEqual from 'lodash/isEqual';
import type { CreateProductDto } from '@/types';

/**
 * The backend validates `skuList` against the `variations` of the *same*
 * request, so one may never travel without the other: sending a new `skuList`
 * with the stored `variations` (or vice versa) is how a variant product loses
 * its rows.
 */
const VARIATION_PAIR = ['variations', 'skuList'] as const;

/**
 * Reduces a full product payload to only the fields that differ from the saved
 * product.
 *
 * Backend 2026-08-02: PATCHing the whole form is what creates the lost-update
 * case — two tabs editing different fields, the slower save reverting the other
 * tab's unrelated change back to the value its form was hydrated with. Sending
 * only dirty fields removes it without any locking.
 *
 * Keys whose next value is `undefined` are dropped rather than sent: `JSON`
 * omits them anyway, and PATCH treats an absent key as "leave unchanged" — so
 * clearing an optional field is not expressible through this endpoint today.
 */
export function dirtyProductPatch(
  baseline: CreateProductDto,
  next: CreateProductDto,
): Partial<CreateProductDto> {
  const patch: Record<string, unknown> = {};

  const keys = new Set([...Object.keys(baseline), ...Object.keys(next)] as (keyof CreateProductDto)[]);
  for (const key of keys) {
    const nextValue = next[key];
    if (nextValue === undefined) continue;
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

  return patch as Partial<CreateProductDto>;
}
