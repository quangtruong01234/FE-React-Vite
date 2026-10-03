import type { ApiError } from '@/types';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator } from '@/lib/i18n/messages';
import { productFormMessages } from './productForm.i18n';

/**
 * Pure helpers for brand/category proposal errors (SEC-L3).
 *
 * Backend contract: `POST /products/brands` / `POST /products/categories`
 * reject a name that case-insensitively matches an existing active or
 * pending row (after trimming) with `409`. Client-side exact-match checks
 * stay as UX only — the backend list also covers other users' pending rows.
 */

const EXISTS = {
  brand: 'proposalExistsBrand',
  category: 'proposalExistsCategory',
} as const;

const FALLBACK = {
  brand: 'proposalFailedBrand',
  category: 'proposalFailedCategory',
} as const;

/** Friendly message for a failed brand/category proposal. */
export function proposalErrorMessage(
  kind: 'brand' | 'category',
  error: unknown,
  lang: Lang = 'vi',
): string {
  const t = bindTranslator(productFormMessages, lang);
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 409) return t(EXISTS[kind]);
  return t(FALLBACK[kind]);
}
