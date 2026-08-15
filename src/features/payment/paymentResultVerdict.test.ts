import { describe, it, expect } from 'vitest';
import { resolvePaymentVerdict } from './paymentResultVerdict';
import type { PaymentResult } from '@/types';

function result(status: string): PaymentResult {
  return { gateway: 'zalopay', status, transId: 'tx_1', amount: '120000' };
}

describe('resolvePaymentVerdict', () => {
  it.each(['success', '1', '00'])('treats %s as a paid transaction', (status) => {
    expect(resolvePaymentVerdict(result(status), false)).toBe('success');
  });

  it.each(['failed', '-49', '24', ''])('treats %s as a failed transaction', (status) => {
    expect(resolvePaymentVerdict(result(status), false)).toBe('failed');
  });

  it('never claims failure when the verify request itself errored', () => {
    expect(resolvePaymentVerdict(undefined, true)).toBe('unverified');
  });

  it('stays unverified even if a stale payload sits next to the error', () => {
    expect(resolvePaymentVerdict(result('success'), true)).toBe('unverified');
  });

  it('stays unverified when the query never ran (no gateway params)', () => {
    expect(resolvePaymentVerdict(undefined, false)).toBe('unverified');
  });
});
