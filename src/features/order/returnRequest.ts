import uniq from 'lodash/uniq';
import type {
  ApiError,
  CreateReturnRequestDto,
  OrderStatus,
  ReturnRequest,
  ReturnRequestStatus,
} from '@/types';
import { paymentLabel } from './orderConstants';
import type { Lang } from '@/lib/i18n/lang';
import { bindTranslator, type MessageKey } from '@/lib/i18n/messages';
import { orderMessages } from './order.i18n';
import { isReturnStatus } from '@/lib/domain/orderStatus';
import { userSummaryLabel } from '@/lib/format/user';
import { MAX_IMAGE_BYTES, validateUploadFile, type FileLike } from '@/lib/http/uploadValidation';
import { mediaNotOwnedMessage } from '@/lib/http/uploadOwner';

/**
 * Pure helpers for the buyer return/refund flow (F2).
 *
 * Backend contract: `POST /order/:id/return-request` is only accepted while the
 * order is `delivering`/`completed` and has no active (pending_review) request —
 * anything else returns 400. Creating a request flips the order to
 * `return_requested`, so an eligible status already implies no active request
 * (a rejected request restores the previous status and MAY be re-requested).
 */
export function canRequestReturn(status: OrderStatus): boolean {
  return status === 'delivering' || status === 'completed';
}

/** Order statuses for which a return request may exist and should be surfaced. */
export function hasReturnActivity(status: OrderStatus): boolean {
  return isReturnStatus(status);
}

/**
 * Latest request for an order from a newest-first list (`/return-requests/mine`
 * orders by most recent activity, so the first match wins).
 */
export function findReturnRequestForOrder(
  requests: ReturnRequest[],
  orderId: string,
): ReturnRequest | null {
  return requests.find((r) => r.orderId === orderId) ?? null;
}

export interface ReturnStatusMeta {
  label: string;
  className: string;
}

const RETURN_STATUS_META: Record<
  ReturnRequestStatus,
  { labelKey: MessageKey<typeof orderMessages>; className: string }
> = {
  pending_review: { labelKey: 'returnPending', className: 'bg-tb-amber/10 text-accent-amber border-tb-amber/20' },
  approved:       { labelKey: 'returnApproved', className: 'bg-tb-green/10 text-accent-green border-tb-green/20' },
  rejected:       { labelKey: 'returnRejected', className: 'bg-tb-red/10 text-accent-red border-tb-red/20' },
};

export function returnStatusMeta(status: ReturnRequestStatus, lang: Lang = 'vi'): ReturnStatusMeta {
  const { labelKey, className } = RETURN_STATUS_META[status] ?? RETURN_STATUS_META.pending_review;
  return { label: bindTranslator(orderMessages, lang)(labelKey), className };
}

/** Human line for the recorded refund: online methods settle instantly, COD is manual. */
export function refundStatusLabel(request: ReturnRequest, lang: Lang = 'vi'): string | null {
  if (request.status !== 'approved' || !request.refundStatus) return null;
  const t = bindTranslator(orderMessages, lang);
  const method = request.refundMethod ? paymentLabel(request.refundMethod, lang) : null;
  const base = request.refundStatus === 'refunded' ? t('refundDone') : t('refundManual');
  return method ? `${base} · ${method}` : base;
}

/**
 * Who decided the request — the `reviewer` embed (OVERFETCH-01 §7) when the
 * backend sent it, else the bare `reviewedBy` id. Null while the request is
 * still awaiting review, and on old rows that were decided before the backend
 * started recording a reviewer.
 */
export function reviewerLabel(request: ReturnRequest): string | null {
  if (request.status === 'pending_review') return null;
  return userSummaryLabel(request.reviewer, request.reviewedBy);
}

/** `errorCode` on a 400 whose every failing rule is on `imageUrls` (RETURN-PHOTO-ERRCODE-01). */
export const RETURN_PHOTO_INVALID = 'RETURN_PHOTO_INVALID';

/**
 * Friendly message for a failed return-request submit, keyed on `errorCode`:
 * `RETURN_PHOTO_INVALID` (400) is about the photos, `MEDIA_NOT_OWNED` (403) is a
 * photo uploaded by another account. An untagged 400 is an ineligible order.
 *
 * The `/imageUrls/i` message test is a fallback for a gateway that predates the
 * code (prod `api` at `26fc40c` sends photo 400s untagged) — drop it once
 * RETURN-PHOTO-ERRCODE-01 is live on prod, same as `isOrderOutcomeUnknown`.
 */
export function returnRequestErrorMessage(error: unknown, lang: Lang = 'vi'): string {
  const t = bindTranslator(orderMessages, lang);
  const err = error as ApiError | undefined;
  if (err?.errorCode === RETURN_PHOTO_INVALID) return t('returnPhotoRejected');
  const notOwned = mediaNotOwnedMessage(error, lang);
  if (notOwned) return notOwned;
  if (err?.statusCode === 400) {
    if (err.errorCode === undefined && typeof err.message === 'string' && /imageUrls/i.test(err.message)) {
      return t('returnPhotoRejected');
    }
    return t('returnIneligible');
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return t('returnFailed');
}

// RETURN-PHOTO-01: the backend caps `imageUrls` at 5 unique Cloudinary URLs from
// `trybuy/returns`, and that folder only takes jpg/png/webp.
export const MAX_RETURN_PHOTOS = 5;
export const RETURN_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
const RETURN_PHOTO_MIME: ReadonlySet<string> = new Set(RETURN_PHOTO_ACCEPT.split(','));
const RETURN_PHOTO_EXT: ReadonlySet<string> = new Set(['jpg', 'jpeg', 'png', 'webp']);

/**
 * Pre-upload guard for one return photo. The shared upload validator accepts
 * any `image/*`, which would let a GIF or HEIC through to a signature the
 * returns folder then refuses — so the format is narrowed here first.
 */
export function returnPhotoError(file: FileLike, lang: Lang = 'vi'): string | null {
  const mime = (file.type ?? '').toLowerCase();
  const ext = file.name?.split('.').pop()?.toLowerCase() ?? '';
  const formatOk = mime ? RETURN_PHOTO_MIME.has(mime) : RETURN_PHOTO_EXT.has(ext);
  if (!formatOk) return bindTranslator(orderMessages, lang)('returnPhotoFormat');
  return validateUploadFile(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES }, lang);
}

/**
 * Body for `POST /order/:id/return-request`. `imageUrls` is left out entirely
 * when there are no photos: a gateway that predates RETURN-PHOTO-01 rejects
 * unknown body keys (`forbidNonWhitelisted`), so a text-only request must keep
 * the old shape to stay valid on either backend.
 */
export function returnRequestPayload(reason: string, imageUrls: readonly string[] = []): CreateReturnRequestDto {
  const urls = uniq(imageUrls.filter((url) => url.length > 0)).slice(0, MAX_RETURN_PHOTOS);
  const body: CreateReturnRequestDto = { reason: reason.trim() };
  if (urls.length > 0) body.imageUrls = urls;
  return body;
}
