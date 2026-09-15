import type { UserSummary } from '@/types';

/**
 * The trimmed string, or `null` when there is nothing visible in it.
 *
 * A name made only of spaces is not a name, and `??` does not catch it — `''`
 * is not nullish, so a bare `name ?? username` renders an empty label. Shared
 * because that exact trap has to be handled everywhere a person is labelled:
 * post/comment authors, search rows, the profile header, the chat header, the
 * sidebar identity card, the admin order list, the seller name.
 *
 * `PATCH /user/:id` accepts `name: "   "` and stores it verbatim; the backend
 * only normalises whitespace to `null` inside the social `author` embed, so
 * every other source (`/user/me`, `/user/:id`, the chat user embed, featured
 * sellers) can still hand the UI a string of spaces.
 */
export function nonBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/** Shown when nothing identifies a person — never paired with a raw id. */
export const USER_FALLBACK = 'Người dùng';

/**
 * Display label for a person: the display name they set, else their username.
 *
 * Covers every embed where `name` means *display name* — post/comment/reply
 * authors, `GET /user/search` rows, `/user/me`, `GET /user/:id`, the chat peer,
 * an order's buyer. Since AUTHOR-NAME-01 (backend, 2026-09-15) the social embed
 * carries `name` too; before that the key was never sent and every label
 * silently fell through to `username`. `name` stays nullable — most accounts
 * never set one — so `username` remains the answer for them, not a blank row.
 *
 * `fallback` covers the case where the whole embed is missing (query still in
 * flight, or the account is gone). Pass one that carries an id when the screen
 * needs to tell two unresolved rows apart; otherwise the neutral default.
 *
 * ⚠️ Do NOT reuse this for a **product** seller: in the product embed `name`
 * holds the *username* by design (ENRICH-BATCH-01), the opposite convention.
 * That side has its own helper, `features/product/sellerName.ts`.
 */
export function userDisplayName(
  user: { name?: string | null; username?: string | null } | null | undefined,
  fallback: string = USER_FALLBACK,
): string {
  return nonBlank(user?.name) ?? nonBlank(user?.username) ?? fallback;
}

/**
 * Display label for a hydrated user reference (OVERFETCH-01 §7) — the `actor` /
 * `reviewer` / `reporter` embeds the gateway attaches next to a bare public id.
 *
 * The embed is optional on every response that carries one: it is absent when
 * the underlying id is null, and absent on any response served before the
 * backend rollout. The bare id therefore stays the fallback, so a screen that
 * used to print the raw id never renders blank. Returns `null` only when there
 * is nothing at all to show.
 */
export function userSummaryLabel(
  summary: UserSummary | null | undefined,
  fallbackId: string | null,
): string | null {
  const username = summary?.username;
  if (username) return `@${username}`;
  return fallbackId ? `#${fallbackId}` : null;
}
