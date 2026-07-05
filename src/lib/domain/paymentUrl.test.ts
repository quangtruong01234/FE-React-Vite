import { describe, it, expect, vi } from 'vitest';
import { resolvePaymentUrl } from './paymentUrl';

const noSleep = (): Promise<void> => Promise.resolve();

describe('resolvePaymentUrl', () => {
  it('returns immediately when the url is already present', async () => {
    const fetchResult = vi.fn().mockResolvedValue({ orderUrl: 'https://gw/pay', status: 'pending' });

    const result = await resolvePaymentUrl(fetchResult, { sleep: noSleep });

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
