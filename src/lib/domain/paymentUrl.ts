interface PaymentUrlResult {
  orderUrl: string | null;
}

export interface ResolvePaymentUrlOptions {
  retries?: number;
  delayMs?: number;
  /** Injectable delay so tests don't wait on real timers. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The payment gateway generates the order URL asynchronously, so the
 * `payment-url` endpoint of a freshly created order can briefly return
 * `orderUrl: null`. Poll a few times before giving up so checkout and the
 * "Thanh toán ngay" re-pay action don't fail on that race. A stale order
 * already has a URL, so it resolves on the first attempt with no extra delay.
 */
export async function resolvePaymentUrl<T extends PaymentUrlResult>(
  fetchResult: () => Promise<T>,
  options: ResolvePaymentUrlOptions = {},
): Promise<T & { orderUrl: string }> {
  const retries = options.retries ?? 4;
  const delayMs = options.delayMs ?? 800;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await fetchResult();
    if (result.orderUrl) return result as T & { orderUrl: string };
    if (attempt < retries) await sleep(delayMs);
  }
  throw new Error('Không nhận được đường dẫn thanh toán.');
}

const PAYMENT_URL_FALLBACK = 'Không tạo được liên kết thanh toán. Vui lòng thử lại.';

/**
 * User-facing message for a failed `GET /api/order/:id/payment-url`.
 *
 * PROD-PAY-01 (backend 2026-07-31): the route no longer answers
 * `200 {"orderUrl": null}` forever when issuance genuinely fails — it returns a
 * non-2xx **with a message** explaining why (gateway rejected, misconfigured
 * return URL, …). That message is the only thing that tells the buyer whether
 * retrying can help, so it must reach the screen.
 *
 * `request()` throws a plain `ApiError` object, NOT an `Error` subclass, so an
 * `error instanceof Error` check silently drops every backend message here —
 * duck-type on `message` instead.
 */
export function paymentUrlErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return PAYMENT_URL_FALLBACK;
}

/**
 * Hand the browser off to the external payment gateway. This is the one
 * sanctioned use of `window.location`: router navigation (`useNavigate`) only
 * moves between in-app SPA routes, never to a cross-origin gateway URL.
 * Isolating it in a named helper keeps components/hooks free of raw
 * `window.location` (so the React Compiler stops flagging the global
 * assignment) and removes the duplicated redirect at the two checkout/re-pay
 * call sites.
 */
export function redirectToPaymentGateway(url: string): void {
  window.location.assign(url);
}
