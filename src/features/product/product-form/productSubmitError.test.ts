import { describe, it, expect } from 'vitest';
import { productSubmitError } from './productSubmitError';

const apiError = (statusCode: number, message: string) => ({ statusCode, status: statusCode, message });

describe('productSubmitError', () => {
  it('names the colliding SKU from the backend message (2026-08-03 contract)', () => {
    const result = productSubmitError(apiError(409, 'Inventory with sku PROD-97 already exists'), 'create');

    expect(result.field).toBe('sku');
    expect(result.message).toContain('PROD-97');
  });

  it('points a duplicate-SKU 409 at the SKU field in EDIT mode too', () => {
    // Regression: edit mode used to fall through to "Không thể lưu tồn kho".
    const result = productSubmitError(apiError(409, 'Product with this SKU already exists'), 'edit');

    expect(result.field).toBe('sku');
    expect(result.message).not.toMatch(/tồn kho/i);
  });

  it('does not mistake the word "already" for an SKU name', () => {
    const result = productSubmitError(apiError(409, 'Product with this SKU already exists'), 'create');

    expect(result.message).not.toContain('already');
  });

  it('treats a version conflict as a soft reload-and-retry, not a hard error', () => {
    const result = productSubmitError(
      apiError(409, 'Product was modified by someone else — reload it and apply your changes again'),
      'edit',
    );

    expect(result.field).toBeNull();
    expect(result.message).toMatch(/tải lại/i);
  });

  it('keeps the pre-existing inventory-row 409 as a form-level message', () => {
    const result = productSubmitError(apiError(409, 'Inventory for product ID 96 already exists'), 'create');

    expect(result.field).toBeNull();
    expect(result.message).toMatch(/trùng/i);
  });

  it('surfaces the backend message for 400 / 404', () => {
    expect(productSubmitError(apiError(400, 'price must not be less than 0'), 'create')).toEqual({
      field: null,
      message: 'price must not be less than 0',
    });
    expect(productSubmitError(apiError(404, 'Brand not found'), 'edit')).toEqual({
      field: null,
      message: 'Brand not found',
    });
  });

  it('falls back per mode for anything else', () => {
    expect(productSubmitError(apiError(500, 'Internal server error'), 'create').message).toMatch(/tồn kho/i);
    expect(productSubmitError(new TypeError('Failed to fetch'), 'edit').message).toMatch(/lưu thay đổi/i);
  });
});
