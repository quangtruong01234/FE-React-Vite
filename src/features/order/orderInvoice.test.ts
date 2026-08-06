import { describe, it, expect } from 'vitest';
import { invoiceFileName, invoiceErrorMessage } from './orderInvoice';

describe('invoiceFileName', () => {
  it('mirrors the backend Content-Disposition filename', () => {
    expect(invoiceFileName('ord_0000000000000119')).toBe('invoice-ord_0000000000000119.pdf');
    expect(invoiceFileName('ord_0000000000000001')).toBe('invoice-ord_0000000000000001.pdf');
  });
});

describe('invoiceErrorMessage', () => {
  it('maps 403 to a permission message (seller/admin/buyer only)', () => {
    expect(invoiceErrorMessage({ statusCode: 403 })).toBe(
      'Bạn không có quyền tải hóa đơn của đơn hàng này.',
    );
  });

  it('maps 404 to order-not-found', () => {
    expect(invoiceErrorMessage({ statusCode: 404 })).toBe('Không tìm thấy đơn hàng.');
  });

  it('maps 400 to invalid id', () => {
    expect(invoiceErrorMessage({ statusCode: 400 })).toBe('Mã đơn hàng không hợp lệ.');
  });

  it('maps 401 to a login prompt', () => {
    expect(invoiceErrorMessage({ statusCode: 401 })).toBe(
      'Vui lòng đăng nhập để tải hóa đơn.',
    );
  });

  it('falls back to a generic retry message for unknown / networkless errors', () => {
    expect(invoiceErrorMessage({ statusCode: 500 })).toBe(
      'Không tải được hóa đơn. Vui lòng thử lại.',
    );
    expect(invoiceErrorMessage(new Error('boom'))).toBe(
      'Không tải được hóa đơn. Vui lòng thử lại.',
    );
    expect(invoiceErrorMessage(undefined)).toBe(
      'Không tải được hóa đơn. Vui lòng thử lại.',
    );
  });
});
