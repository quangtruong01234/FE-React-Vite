import type { PaymentResult } from '@/types';

/**
 * What the result page is allowed to tell the buyer.
 *
 * `unverified` exists because the page used to collapse it into `failed`: the
 * verify call is `retry: false`, so one 500 / timeout / offline blip on
 * `/gateway/payment-result` left `data === undefined`, which fell straight into
 * the red "Thanh toán thất bại" panel. A buyer whose money *had* left the
 * gateway was told the payment failed, with the cart still full — an invitation
 * to pay twice. A request we could not complete says nothing about the
 * transaction, so it gets its own neutral branch that points at the order (the
 * real source of truth) instead of asserting an outcome.
 */
export type PaymentVerdict = 'success' | 'failed' | 'unverified';

/** Gateway success codes: ZaloPay returns `1`, VNPay `00`, our own layer `success`. */
const SUCCESS_CODES = new Set(['success', '1', '00']);

/**
 * `isError` covers a rejected verify request; a missing `data` covers the
 * disabled-query case (landing on the page with no gateway params at all).
 * Only an actual response may produce `success` or `failed`.
 */
export function resolvePaymentVerdict(
  data: PaymentResult | undefined,
  isError: boolean,
): PaymentVerdict {
  if (isError || data == null) return 'unverified';
  return SUCCESS_CODES.has(data.status) ? 'success' : 'failed';
}
