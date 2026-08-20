import type { UserSummary } from '@/types';

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
