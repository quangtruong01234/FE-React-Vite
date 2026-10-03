import type { ApiError } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { productFormMessages } from './productForm.i18n';

export interface ProductSubmitError {
  /** Form field the message belongs to; `null` → the form-level banner. */
  field: 'sku' | null;
  message: string;
}

/**
 * Captures the SKU out of `"Inventory with sku PROD-97 already exists"` (backend
 * 2026-08-03 — the 409 used to name a product id the seller had never seen).
 * The trailing `already exists` anchor is what keeps `"Product with this SKU
 * already exists"` from capturing the word "already" as the SKU.
 */
const NAMED_SKU = /\bsku\s+([A-Za-z0-9][\w.-]*)\s+already exists/i;

const FALLBACK = {
  create: 'submitCreateFailed',
  edit: 'submitEditFailed',
} as const;

/**
 * Classifies a failed product create/update into "which field is wrong" +
 * "what to tell the seller".
 *
 * Backend contract for `409` on `POST /api/products` / `PATCH /api/products/:id`:
 *  - `"Inventory with sku <SKU> already exists"` / `"Product with this SKU
 *    already exists"` → the SKU is taken. This is a field problem, not a stock
 *    problem — edit mode used to show "Không thể lưu tồn kho", which pointed the
 *    seller at the wrong thing entirely.
 *  - `"Product was modified by someone else — reload it and apply your changes
 *    again"` → an optimistic-locking conflict. Never a hard error: the seller
 *    reloads and re-applies. (Only reachable if the form opts into `version`.)
 *  - `"Inventory for product ID <n> already exists"` → the product already owns
 *    an inventory row; nothing on the form to point at.
 */
export function productSubmitError(
  error: unknown,
  mode: 'create' | 'edit',
  lang: Lang = 'vi',
): ProductSubmitError {
  const t = bindTranslator(productFormMessages, lang);
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  const raw = typeof err?.message === 'string' ? err.message.trim() : '';

  if (status === 409) {
    if (/modified by someone else|\bversion\b/i.test(raw)) {
      return {
        field: null,
        message: t('submitConflict'),
      };
    }
    if (/\bsku\b/i.test(raw)) {
      const named = NAMED_SKU.exec(raw)?.[1];
      return {
        field: 'sku',
        message: named ? t('skuTakenNamed', { sku: named }) : t('skuTaken'),
      };
    }
    return { field: null, message: t('submitStale') };
  }

  // 400 validation / 404 unknown brand-category-product: the backend message
  // names the offending field, so it beats any generic copy we could write.
  if ((status === 400 || status === 404) && raw.length > 0) {
    return { field: null, message: raw };
  }

  return { field: null, message: t(FALLBACK[mode]) };
}
