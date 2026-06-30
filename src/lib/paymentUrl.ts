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
