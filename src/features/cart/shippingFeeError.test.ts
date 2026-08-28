import { describe, it, expect } from 'vitest';
import { isGhnAddressRefusal, shippingFeeFailure } from './shippingFeeError';

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

  it('strips the "call this endpoint instead" tail — that instruction is for us (GHN-DIST-01)', () => {
    const failure = shippingFeeFailure({
      statusCode: 400,
      message: 'GHN does not know district 999999 — pick a district from GET /api/shipping/districts',
    });
    expect(failure.message).toContain('district 999999');
    expect(failure.message).not.toMatch(/GET|\/api\//);
  });

  it('renders our own Vietnamese copy for the frozen ward refusals (GHN-MSG-01, GHN-WARD-01)', () => {
    for (const message of [
      'GHN preview error: GHN cannot deliver to this ward — pick another shipping address',
      'GHN no longer delivers to ward 20804 — pick another ward from GET /api/shipping/wards',
      'Ward 20308 does not belong to GHN district 1442 — pick a ward from GET /api/shipping/wards',
    ]) {
      const failure = shippingFeeFailure({ statusCode: 400, message });
      expect(failure.kind).toBe('address');
      // No English, no raw ward code, no endpoint name reaches the buyer.
      expect(failure.message).not.toMatch(/GHN|GET|\/api\/|ward|deliver/i);
      expect(failure.message).not.toMatch(/\d/);
      expect(failure.message).toContain('phường/xã');
      expect(failure.message).toContain('chọn hoặc cập nhật địa chỉ khác');
    }
  });

  it('keeps passing through a 400 whose wording the backend has not frozen', () => {
    // A bad phone still comes back verbatim (GHN-MSG-01) — mistranslating it as
    // "wrong ward" would send the buyer to fix the wrong field.
    const failure = shippingFeeFailure({
      statusCode: 400,
      message:
        'GHN preview error: Lỗi gọi API: master_data_validate_phone - số điện thoại 123 không đúng',
    });
    expect(failure.kind).toBe('address');
    expect(failure.message).toContain('số điện thoại 123 không đúng');
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

describe('isGhnAddressRefusal', () => {
  it('recognises the refusals GHN-CREATE-01 can raise on order create', () => {
    for (const message of [
      'GHN does not know district 999999 — pick a district from GET /api/shipping/districts',
      'Ward 20308 does not belong to GHN district 1442 — pick a ward from GET /api/shipping/wards',
      'Cannot resolve province "Hà Nộii" to a GHN province',
      // GHN-MSG-01 / GHN-WARD-01 — same field, same fix for the buyer.
      'GHN cannot deliver to this ward — pick another shipping address',
      'GHN no longer delivers to ward 20804 — pick another ward from GET /api/shipping/wards',
    ]) {
      expect(isGhnAddressRefusal({ statusCode: 400, message })).toBe(true);
    }
  });

  it('leaves the other checkout 400s alone', () => {
    // These must keep their own backend text — telling the buyer to change the
    // delivery address would send them to fix the wrong thing.
    for (const message of [
      'Insufficient stock for product prod_ffc802c681d211f1',
      'Voucher code EXPIRED10 is no longer valid',
      'items should not be empty',
    ]) {
      expect(isGhnAddressRefusal({ statusCode: 400, message })).toBe(false);
    }
  });

  it('is false for anything that is not a 400', () => {
    // A GHN outage is a 503 and never blocks create — only a refusal is a 400.
    expect(isGhnAddressRefusal({ statusCode: 503, message: 'GHN unavailable' })).toBe(false);
    expect(isGhnAddressRefusal({ message: 'GHN district missing' })).toBe(false);
    expect(isGhnAddressRefusal(null)).toBe(false);
  });
});
