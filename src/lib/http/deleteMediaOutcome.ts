import type { ApiError } from '@/types';

/**
 * Outcome of a best-effort Cloudinary orphan cleanup (`DELETE /upload/media`).
 *
 * Backend contract (handoff 2026-07-07): happy path is `200 { result: "ok" | "not found" }`;
 * a Cloudinary auth/quota/5xx returns `502`, a network failure `503`, and a
 * foreign/persisted-id rejection `400/403`. Cleanup is fire-and-forget, so we never
 * want any of these to surface as an unhandled rejection — we classify instead of throw.
 */
export type DeleteMediaOutcome =
  | { status: 'deleted' }
  | { status: 'not-found' }
  | { status: 'failed'; transient: boolean };

/** Map the `200` body's `result` string to an outcome. */
export function outcomeFromResult(result: string): DeleteMediaOutcome {
  return result === 'not found' ? { status: 'not-found' } : { status: 'deleted' };
}

function statusCodeOf(error: unknown): number | undefined {
  if (error !== null && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as ApiError).statusCode;
    if (typeof code === 'number') return code;
  }
  return undefined;
}

/**
 * Map a thrown delete error to a failed outcome. `502`/`503` are transient
 * (Cloudinary/network — retry or leave orphan); everything else (`400`/`403`
 * foreign or persisted id, unknown) is a permanent cleanup failure — leave orphan.
 */
export function outcomeFromError(error: unknown): DeleteMediaOutcome {
  const code = statusCodeOf(error);
  return { status: 'failed', transient: code === 502 || code === 503 };
}
