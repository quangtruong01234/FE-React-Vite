import { describe, it, expect, vi } from 'vitest';
import { resolvePaymentUrl, redirectToPaymentGateway, paymentUrlErrorMessage } from './paymentUrl';

const noSleep = (): Promise<void> => Promise.resolve();

describe('resolvePaymentUrl', () => {
  it('returns immediately when the url is already present', async () => {
    const fetchResult = vi.fn().mockResolvedValue({ orderUrl: 'https://gw/pay', status: 'pending' });

    const result = await resolvePaymentUrl<{ orderUrl: string | null; status: string }>(fetchResult, { sleep: noSleep });

    expect(result.orderUrl).toBe('https://gw/pay');
    expect(result.status).toBe('pending');
    expect(fetchResult).toHaveBeenCalledTimes(1);
  });

  it('retries while the gateway url is still null, then resolves', async () => {
    const fetchResult = vi
      .fn()
      .mockResolvedValueOnce({ orderUrl: null })
      .mockResolvedValueOnce({ orderUrl: null })
      .mockResolvedValueOnce({ orderUrl: 'https://gw/late' });

    const result = await resolvePaymentUrl(fetchResult, { sleep: noSleep });

    expect(result.orderUrl).toBe('https://gw/late');
    expect(fetchResult).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries when the url never arrives', async () => {
    const fetchResult = vi.fn().mockResolvedValue({ orderUrl: null });

    await expect(
      resolvePaymentUrl(fetchResult, { retries: 2, sleep: noSleep }),
    ).rejects.toThrow('Không nhận được đường dẫn thanh toán.');
    expect(fetchResult).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
  });
});

describe('paymentUrlErrorMessage', () => {
  it('surfaces the backend message from a plain ApiError object (PROD-PAY-01)', () => {
    // request() throws a plain object, not an Error — instanceof would drop this.
    const apiError = { statusCode: 502, status: 502, message: 'Payment gateway rejected the order' };

    expect(paymentUrlErrorMessage(apiError)).toBe('Payment gateway rejected the order');
  });

  it('surfaces the message of a thrown Error (poll exhausted)', () => {
    expect(paymentUrlErrorMessage(new Error('Không nhận được đường dẫn thanh toán.'))).toBe(
      'Không nhận được đường dẫn thanh toán.',
    );
  });

  it('falls back when the error carries no usable message', () => {
    const fallback = 'Không tạo được liên kết thanh toán. Vui lòng thử lại.';

    expect(paymentUrlErrorMessage(undefined)).toBe(fallback);
    expect(paymentUrlErrorMessage(null)).toBe(fallback);
    expect(paymentUrlErrorMessage('boom')).toBe(fallback);
    expect(paymentUrlErrorMessage({ statusCode: 500 })).toBe(fallback);
    expect(paymentUrlErrorMessage({ message: '   ' })).toBe(fallback);
  });
});

describe('redirectToPaymentGateway', () => {
  it('hands the browser off to the external gateway url', () => {
    // jsdom's window.location.assign is non-configurable, so swap the whole
    // location object for a stub and restore it afterwards.
    const original = window.location;
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { assign },
    });

    try {
      redirectToPaymentGateway('https://gw.example/pay?token=abc');

      expect(assign).toHaveBeenCalledTimes(1);
      expect(assign).toHaveBeenCalledWith('https://gw.example/pay?token=abc');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });
});
