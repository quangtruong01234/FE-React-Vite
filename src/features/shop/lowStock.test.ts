import { describe, it, expect } from 'vitest';
import { buildLowStockRows } from './lowStock';
import type { InventoryRecord } from '@/types';

function record(partial: Partial<InventoryRecord>): InventoryRecord {
  return {
    id: 1,
    productId: 1,
    sku: 'SKU-1',
    availableStock: 0,
    isLowStock: true,
    productName: 'Sản phẩm mẫu',
    ...partial,
  };
}

describe('buildLowStockRows', () => {
  it('reads the denormalized productName from the record', () => {
    const rows = buildLowStockRows([
      record({ id: 5, productId: 42, sku: 'AB-1', availableStock: 2, minimumStock: 5, productName: 'Tai nghe Sony' }),
    ]);
    expect(rows).toEqual([
      { id: 5, productId: 42, name: 'Tai nghe Sony', sku: 'AB-1', availableStock: 2, minimumStock: 5 },
    ]);
  });

  it('falls back to the SKU when productName is null (orphaned row)', () => {
    const rows = buildLowStockRows([record({ sku: 'OUT-9', productName: null })]);
    expect(rows[0].name).toBe('OUT-9');
  });

  it('falls back to the SKU when productName is absent (older response shape)', () => {
    const rows = buildLowStockRows([record({ sku: 'OLD-1', productName: undefined })]);
    expect(rows[0].name).toBe('OLD-1');
  });

  it('coerces string bigint id/productId from the backend', () => {
    const rows = buildLowStockRows([
      record({ id: '7' as unknown as number, productId: '42' as unknown as number }),
    ]);
    expect(rows[0].id).toBe(7);
    expect(rows[0].productId).toBe(42);
  });

  it('defaults minimumStock to 0 when the record omits it', () => {
    const rows = buildLowStockRows([record({ minimumStock: undefined })]);
    expect(rows[0].minimumStock).toBe(0);
  });

  it('preserves the backend availableStock-ASC ordering', () => {
    const rows = buildLowStockRows([
      record({ id: 1, sku: 'A', availableStock: 0 }),
      record({ id: 2, sku: 'B', availableStock: 3 }),
    ]);
    expect(rows.map((r) => r.sku)).toEqual(['A', 'B']);
  });
});
