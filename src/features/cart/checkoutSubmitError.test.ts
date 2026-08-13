import { describe, it, expect } from 'vitest';
import { checkoutSubmitErrorMessage } from './checkoutSubmitError';

/** The three refusals GHN-CREATE-01 says `POST /api/order` can now answer with. */
const GHN_REFUSALS = [
  'GHN does not know district 999999 — pick a district from GET /api/shipping/districts',
  'Ward 20308 does not belong to GHN district 1442 — pick a ward from GET /api/shipping/wards',
  'Cannot resolve province "Hà Nộii" to a GHN province',
];

describe('checkoutSubmitErrorMessage', () => {
  it('turns a GHN address refusal into the same wording as the fee banner', () => {
    for (const message of GHN_REFUSALS) {
      const text = checkoutSubmitErrorMessage({ statusCode: 400, status: 400, message });
      expect(text).toContain('Không giao được tới địa chỉ này');
      expect(text).toContain('chọn hoặc cập nhật địa chỉ khác');
    }
  });

  it('does not show the buyer which endpoint to call instead', () => {
    const text = checkoutSubmitErrorMessage({
      statusCode: 400,
      message: 'GHN does not know district 999999 — pick a district from GET /api/shipping/districts',
    });
    expect(text).not.toMatch(/GET|\/api\//);
    expect(text).toContain('district 999999');
  });

  it('passes any other backend message through unchanged', () => {
    // Stock shortages, voucher problems, idempotency conflicts — the backend
    // text is already the actionable one, and none of them is an address issue.
    expect(
      checkoutSubmitErrorMessage({ statusCode: 400, message: 'Insufficient stock for product prod_x' }),
    ).toBe('Insufficient stock for product prod_x');
    expect(checkoutSubmitErrorMessage({ statusCode: 409, message: 'Order already placed' })).toBe(
      'Order already placed',
    );
  });

  it('does not mistake a non-400 GHN failure for a bad address', () => {
    // 503 = carrier outage. Create still returns 201 in that case, so a 503 here
    // is something else entirely — never tell the buyer to change the address.
    const text = checkoutSubmitErrorMessage({ statusCode: 503, message: 'GHN unavailable' });
    expect(text).toBe('GHN unavailable');
  });

  it('falls back to the generic line when there is no usable message', () => {
    for (const error of [{ statusCode: 500 }, { message: '   ' }, { message: undefined }, null, 'boom']) {
      expect(checkoutSubmitErrorMessage(error)).toBe('Đặt hàng thất bại. Vui lòng thử lại.');
    }
  });
});
