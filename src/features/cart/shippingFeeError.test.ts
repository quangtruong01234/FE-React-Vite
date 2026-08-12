import { describe, it, expect } from 'vitest';
import { shippingFeeFailure } from './shippingFeeError';

describe('shippingFeeFailure', () => {
  it('treats a 400 as an address the buyer must change', () => {
    const failure = shippingFeeFailure({
      statusCode: 400,
      status: 400,
      message: 'GHN preview error: ward not found',
    });
    expect(failure.kind).toBe('address');
    expect(failure.message).toBe(
      'Không giao được tới địa chỉ này: ward not found. Vui lòng chọn hoặc cập nhật địa chỉ khác.',
    );
  });

  it('strips the GHN integration prefix — it names our plumbing, not the buyer problem', () => {
    for (const message of ['GHN preview error: bad ward', 'ghn fee error:   bad ward']) {
      expect(shippingFeeFailure({ statusCode: 400, message }).message).not.toMatch(/GHN/i);
      expect(shippingFeeFailure({ statusCode: 400, message }).message).toContain('bad ward');
    }
  });

  it('still names the address when the 400 carries no reason', () => {
    expect(shippingFeeFailure({ statusCode: 400 })).toEqual({
      kind: 'address',
      message: 'Không giao được tới địa chỉ này. Vui lòng chọn hoặc cập nhật địa chỉ khác.',
    });
  });

  it('treats a 503 as a carrier outage, not a bad address', () => {
    // Nothing is wrong with what the buyer picked — checkout degrades instead.
    const failure = shippingFeeFailure({ statusCode: 503, message: 'GHN unavailable' });
    expect(failure.kind).toBe('outage');
    expect(failure.message).toContain('tính khi giao hàng');
    expect(failure.message).not.toMatch(/địa chỉ/);
  });

  it('degrades gracefully for any other failure', () => {
    for (const error of [{ statusCode: 500 }, new Error('offline'), null, undefined, 'boom']) {
      expect(shippingFeeFailure(error).kind).toBe('unknown');
    }
    expect(shippingFeeFailure({ statusCode: 500 }).message).toBe(
      'Chưa tính được phí vận chuyển. Phí sẽ được tính khi giao hàng.',
    );
  });
});
