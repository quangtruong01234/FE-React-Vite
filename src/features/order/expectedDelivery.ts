import { formatDate } from '@/lib/format/time';

/**
 * Buyer-facing label for `Order.expectedDeliveryTime` (GHN-ETA-01), or `null`
 * when there is nothing honest to show.
 *
 * Returns `null` — rather than a placeholder — for an absent, `null`, or
 * unparseable value. All three are ordinary: orders predating the backend
 * change never get a date, and an order without a waybill has none yet.
 *
 * Only the date is rendered. GHN commits to a day and encodes it as
 * `...T16:59:59.000Z` (23:59:59 Vietnam time), so printing the time would show
 * a made-up "23:59" precision the carrier never promised.
 */
export function expectedDeliveryLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const formatted = formatDate(iso);
  return formatted ? `Dự kiến giao: ${formatted}` : null;
}
