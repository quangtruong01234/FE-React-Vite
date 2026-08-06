/**
 * Overload/backpressure retry policy for `request()` (backend SCALE-05).
 *
 * When the gateway is saturated it sheds excess requests early with `503` +
 * a `Retry-After` header, *before* the handler runs — so a shed request never
 * reached the backend and one delayed retry is safe for any method (no risk of
 * double-processing a POST). Payment callbacks and health probes are never shed.
 */

/** Upper bound on the retry wait so a large/garbage `Retry-After` can't hang the UI. */
export const MAX_RETRY_DELAY_MS = 5_000;
/** Fallback when `Retry-After` is missing or non-numeric (matches the backend default). */
export const DEFAULT_RETRY_AFTER_SECONDS = 2;

/**
 * Delay in ms to wait before a single retry of an overloaded response, or
 * `null` when the response should not be retried (any non-503 status).
 */
export function overloadRetryDelayMs(status: number, retryAfterHeader: string | null): number | null {
  if (status !== 503) return null;
  const seconds = parseRetryAfterSeconds(retryAfterHeader);
  return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
}

function parseRetryAfterSeconds(header: string | null): number {
  if (header === null || header.trim() === '') return DEFAULT_RETRY_AFTER_SECONDS;
  const seconds = Number(header);
  // The gateway sends integer seconds; fall back to the default for an HTTP-date
  // or any non-numeric value rather than guessing a delay.
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
}
