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
 * our integration, not anything the buyer can act on, so it is stripped.
 */
export type ShippingFeeFailureKind = 'address' | 'outage' | 'unknown';

export interface ShippingFeeFailure {
  kind: ShippingFeeFailureKind;
  /** Buyer-facing Vietnamese message. */
  message: string;
}

const GHN_PREFIX = /^GHN [\w\s]*error:\s*/i;

function rawMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message.replace(GHN_PREFIX, '').trim();
  }
  return '';
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
    case 400:
      return {
        kind: 'address',
        message: reason
          ? `Không giao được tới địa chỉ này: ${reason}. Vui lòng chọn hoặc cập nhật địa chỉ khác.`
          : 'Không giao được tới địa chỉ này. Vui lòng chọn hoặc cập nhật địa chỉ khác.',
      };
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
