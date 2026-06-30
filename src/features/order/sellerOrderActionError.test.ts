import { describe, it, expect } from 'vitest';
import { sellerOrderActionErrorMessage } from './sellerOrderActionError';

describe('sellerOrderActionErrorMessage', () => {
  describe('ready-to-ship', () => {
    it('maps 400 to the unresolvable-address message', () => {
      expect(sellerOrderActionErrorMessage({ statusCode: 400 }, 'ready-to-ship')).toBe(
        'Không thể tạo vận đơn: địa chỉ giao hàng không hợp lệ. Vui lòng kiểm tra lại địa chỉ giao hàng của đơn.',
      );
    });

    it('maps 500 to the GHN-unreachable message', () => {
      expect(sellerOrderActionErrorMessage({ statusCode: 500 }, 'ready-to-ship')).toBe(
        'Không thể kết nối đơn vị vận chuyển (GHN). Đơn vẫn ở trạng thái đã xác nhận — vui lòng thử lại sau.',
      );
    });

    it('uses a ready-to-ship generic fallback when nothing usable is present', () => {
      expect(sellerOrderActionErrorMessage(null, 'ready-to-ship')).toBe(
        'Không thể chuyển đơn sang trạng thái giao hàng. Vui lòng thử lại.',
      );
    });

    it('prefers the server message for unmapped statuses', () => {
      expect(
        sellerOrderActionErrorMessage({ statusCode: 409, message: 'Đơn đã được xử lý' }, 'ready-to-ship'),
      ).toBe('Đơn đã được xử lý');
    });
  });

  describe('confirm', () => {
    it('does not apply the ready-to-ship 400 mapping', () => {
      expect(sellerOrderActionErrorMessage({ statusCode: 400 }, 'confirm')).toBe(
        'Không thể xác nhận đơn. Vui lòng thử lại.',
      );
    });

    it('uses the server message when present', () => {
      expect(sellerOrderActionErrorMessage({ statusCode: 400, message: 'Sai trạng thái' }, 'confirm')).toBe(
        'Sai trạng thái',
      );
    });

    it('uses a confirm generic fallback when nothing usable is present', () => {
      expect(sellerOrderActionErrorMessage(null, 'confirm')).toBe('Không thể xác nhận đơn. Vui lòng thử lại.');
    });
  });
});
