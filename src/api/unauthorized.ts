/**
 * Pure helpers for the global 401 → /login redirect (P2-03).
 *
 * Extracted from `request()` so the redirect decision and target can be unit
 * tested without a live `fetch`/`window`.
 */

/**
 * Whether a failed response should trigger the global unauthorized redirect.
 * Only a 401 redirects, and callers can opt out (e.g. `auth.me()` probing
 * session state must not bounce an anonymous visitor to /login).
 */
export function shouldRedirectToLogin(
  status: number,
  skipUnauthorizedRedirect?: boolean,
): boolean {
  return status === 401 && !skipUnauthorizedRedirect;
}

/** Builds the login redirect target preserving where the user was headed. */
export function buildLoginRedirect(pathname: string): string {
  return `/login?next=${encodeURIComponent(pathname)}`;
}
