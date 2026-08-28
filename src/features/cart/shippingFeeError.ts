/**
 * Classifies a failed GHN shipping-fee preview (RESIL-01).
 *
 * The backend stopped answering a blind 500/502 for every GHN problem:
 *  - `400` — GHN rejected this address (unknown ward, mismatched district).
 *            Actionable: the buyer has to pick a different address, and
 *            retrying the same one will keep failing.
 *  - `503` — GHN is unreachable, rate-limiting us, or the circuit is open.
 *            Nothing is wrong with the address; the fee is simply unknown
 *            right now, so checkout degrades to "tính khi giao hàng".
 *
 * Messages arrive prefixed (`"GHN preview error: <reason>"`) — the prefix names
 * our integration, not anything the buyer can act on, so it is stripped. Since
 * GHN-DIST-01 the reason can also carry a developer-facing tail naming the
 * endpoint to call instead (`"— pick a district from GET /api/shipping/districts"`);
 * that is stripped too, for the same reason.
 *
 * What survives the strip is still English. The backend has frozen the wording
 * of the ward-level refusals (GHN-MSG-01, GHN-WARD-01), so those get Vietnamese
 * copy of our own; anything else keeps passing through, since an unrecognised
 * reason is still more useful to the buyer than a blank one.
 */
export type ShippingFeeFailureKind = 'address' | 'outage' | 'unknown';

export interface ShippingFeeFailure {
  kind: ShippingFeeFailureKind;
  /** Buyer-facing Vietnamese message. */
  message: string;
}

const GHN_PREFIX = /^GHN [\w\s]*error:\s*/i;
/**
 * Trailing instructions aimed at us, not the buyer:
 *  - `"… — pick a district from GET /api/shipping/districts"` (GHN-DIST-01)
 *  - `"… — pick another ward from GET /api/shipping/wards"` (GHN-WARD-01)
 *  - `"… — pick another shipping address"` (GHN-MSG-01)
 */
const ENDPOINT_HINT =
  /\s*[—–-]\s*pick (?:an?|another) (?:\w+ from GET\s+\S+|shipping address)\s*$/i;

/**
 * Refusals whose exact wording the backend froze for us (GHN-MSG-01,
 * GHN-WARD-01, plus the district-mismatch one that predates them). Matched
 * whole rather than by substring, as the backend asked: a future rewording
 * then falls through to the pass-through branch instead of being mistranslated.
 *
 * All three mean the same thing to a buyer — GHN will not carry to the ward on
 * this address — so they share one line of copy.
 */
const WARD_REFUSALS: readonly RegExp[] = [
  /^GHN cannot deliver to this ward$/i,
  /^GHN no longer delivers to ward \S+$/i,
  /^Ward \S+ does not belong to GHN district \S+$/i,
];

const WARD_REFUSED_MESSAGE =
  'Không giao được tới địa chỉ này: đơn vị vận chuyển không nhận giao tới ' +
  'phường/xã đã chọn. Vui lòng chọn hoặc cập nhật địa chỉ khác.';

function rawMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message.replace(GHN_PREFIX, '').replace(ENDPOINT_HINT, '').trim();
    }
  }
  return '';
}

/**
 * Does this failure mean "GHN refuses to carry to this address"?
 *
 * Used by the order-create path (GHN-CREATE-01), which shares the fee preview's
 * three refusal messages but not its dedicated banner. Keyed on the address
 * vocabulary GHN owns — no other `400` on checkout talks about wards, districts
 * or provinces (stock shortages and voucher problems name the product/code).
 */
export function isGhnAddressRefusal(error: unknown): boolean {
  if (statusOf(error) !== 400) return false;
  return /\b(ghn|ward|district|province)\b/i.test(rawMessage(error));
}

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode;
    if (typeof code === 'number') return code;
  }
  return undefined;
}

export function shippingFeeFailure(error: unknown): ShippingFeeFailure {
  const reason = rawMessage(error);

  switch (statusOf(error)) {
    case 400: {
      if (WARD_REFUSALS.some((refusal) => refusal.test(reason))) {
        return { kind: 'address', message: WARD_REFUSED_MESSAGE };
      }
      return {
        kind: 'address',
        message: reason
          ? `Không giao được tới địa chỉ này: ${reason}. Vui lòng chọn hoặc cập nhật địa chỉ khác.`
          : 'Không giao được tới địa chỉ này. Vui lòng chọn hoặc cập nhật địa chỉ khác.',
      };
    }
    case 503:
      return {
        kind: 'outage',
        message:
          'Chưa kết nối được đơn vị vận chuyển. Phí vận chuyển sẽ được tính khi giao hàng.',
      };
    default:
      return {
        kind: 'unknown',
        message: 'Chưa tính được phí vận chuyển. Phí sẽ được tính khi giao hàng.',
      };
  }
}
