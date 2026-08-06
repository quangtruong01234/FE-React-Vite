import { describe, it, expect } from 'vitest';
import { resolveResultOrderId } from './paymentResultParams';

describe('resolveResultOrderId', () => {
  it('accepts a public order id', () => {
    expect(resolveResultOrderId('ord_516a9c38816611f1')).toBe('ord_516a9c38816611f1');
    expect(resolveResultOrderId('ord_AQM4HmbEQnCE2V7X')).toBe('ord_AQM4HmbEQnCE2V7X');
  });

  it('rejects the internal numeric id the gateway actually sends today', () => {
    // Live capture 2026-08-04: VNPay/ZaloPay return URLs carry `order=111`.
    // `/order/111` 400s, so routing to it would ship a guaranteed dead link.
    expect(resolveResultOrderId('111')).toBe('');
    expect(resolveResultOrderId('999')).toBe('');
  });

  it('rejects a missing or empty param', () => {
    expect(resolveResultOrderId(null)).toBe('');
    expect(resolveResultOrderId(undefined)).toBe('');
    expect(resolveResultOrderId('')).toBe('');
  });

  it('rejects gateway transaction refs, which are not order ids', () => {
    // vnp_TxnRef / apptransid land in other params, but a mis-wired gateway
    // config has put them in `order` before — they must never route.
    expect(resolveResultOrderId('1782483321307111')).toBe('');
    expect(resolveResultOrderId('260804_1234567')).toBe('');
  });

  it('rejects near-misses on the public-id shape', () => {
    expect(resolveResultOrderId('ord_516a9c38816611')).toBe(''); // 14 chars
    expect(resolveResultOrderId('ord_516a9c38816611f1x')).toBe(''); // 17 chars
    expect(resolveResultOrderId('usr_516a9c38816611f1')).toBe(''); // wrong prefix
    expect(resolveResultOrderId('ord_516a9c38-16611f1')).toBe(''); // non-alphanumeric
    expect(resolveResultOrderId(' ord_516a9c38816611f1')).toBe(''); // padded
  });
});
