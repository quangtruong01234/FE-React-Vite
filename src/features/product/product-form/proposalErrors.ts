import type { ApiError } from '@/types';

/**
 * Pure helpers for brand/category proposal errors (SEC-L3).
 *
 * Backend contract: `POST /products/brands` / `POST /products/categories`
 * reject a name that case-insensitively matches an existing active or
 * pending row (after trimming) with `409`. Client-side exact-match checks
 * stay as UX only — the backend list also covers other users' pending rows.
 */

const LABEL = {
  brand: 'Thương hiệu',
  category: 'Danh mục',
} as const;

const FALLBACK = {
  brand: 'Không thể tạo thương hiệu. Thử lại sau.',
  category: 'Không thể tạo danh mục. Thử lại sau.',
} as const;

/** Friendly message for a failed brand/category proposal. */
export function proposalErrorMessage(kind: 'brand' | 'category', error: unknown): string {
  const err = error as ApiError | undefined;
  const status = err?.statusCode ?? err?.status;
  if (status === 409) return `${LABEL[kind]} này đã tồn tại hoặc đang chờ duyệt.`;
  return FALLBACK[kind];
}
