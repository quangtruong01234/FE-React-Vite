import { describe, it, expect } from 'vitest';
import type { ProductWithInventory } from '@/types';
import {
  buildOrderItems,
  cartLineName,
  findInactiveLines,
  findStockShortages,
  unavailableProductId,
} from './checkoutItems';

function product(
  partial: Partial<ProductWithInventory> & { id: string },
): ProductWithInventory {
  return {
    name: `Product ${partial.id}`,
    price: 1000,
    inventory: { availableStock: 10 } as ProductWithInventory['inventory'],
    ...partial,
  } as ProductWithInventory;
}

describe('buildOrderItems', () => {
  const map = new Map<string, ProductWithInventory>([
    ['prod_1', product({ id: 'prod_1', name: 'Mug' })],
  ]);

  it('maps productId, name and quantity per line', () => {
    expect(buildOrderItems([{ productId: 'prod_1', skuId: null, quantity: 2 }], map)).toEqual([
      { productId: 'prod_1', productName: 'Mug', quantity: 2 },
    ]);
  });

  it('includes skuId only when the line carries one', () => {
    const [withSku, withoutSku] = buildOrderItems(
      [
        { productId: 'prod_1', skuId: 7, quantity: 1 },
        { productId: 'prod_1', skuId: null, quantity: 1 },
      ],
      map,
    );
    expect(withSku.skuId).toBe(7);
    expect('skuId' in withoutSku).toBe(false);
  });

  it('uses an empty name for a product missing from the map', () => {
    expect(buildOrderItems([{ productId: 'prod_99', quantity: 1 }], map)[0].productName).toBe('');
  });
});

describe('cartLineName', () => {
  it('uses the product name whenever the product resolved', () => {
    expect(cartLineName({ name: 'Tai nghe' }, false)).toBe('Tai nghe');
    // Even mid-failure: a row we did resolve is not in doubt.
    expect(cartLineName({ name: 'Tai nghe' }, true)).toBe('Tai nghe');
  });

  it('claims deletion only when the lookup itself succeeded', () => {
    expect(cartLineName(undefined, false)).toBe('Sản phẩm không còn tồn tại');
  });

  it('does not claim deletion when the lookup failed', () => {
    // BATCH-FAIL-01: an outage answered `200 []`, and now `502`. Neither is
    // evidence that the shopper's items are gone.
    expect(cartLineName(undefined, true)).toBe('Chưa tải được tên sản phẩm');
  });
});

describe('findStockShortages', () => {
  it('passes when every line fits shop-level available stock', () => {
    const products = [product({ id: 'prod_1', inventory: { availableStock: 5 } as ProductWithInventory['inventory'] })];
    expect(findStockShortages([{ productId: 'prod_1', skuId: null, quantity: 5 }], products)).toEqual({});
  });

  it('flags a line exceeding shop-level available stock with the remaining amount', () => {
    const products = [product({ id: 'prod_1', inventory: { availableStock: 3 } as ProductWithInventory['inventory'] })];
    expect(findStockShortages([{ productId: 'prod_1', skuId: null, quantity: 4 }], products)).toEqual({
      prod_1: 'Chỉ còn 3 sản phẩm',
    });
  });

  it('checks the matched SKU stock when the line carries a skuId', () => {
    const products = [
      product({
        id: 'prod_1',
        inventory: { availableStock: 100 } as ProductWithInventory['inventory'],
        skus: [{ id: 7, stockQuantity: 2 } as never],
      }),
    ];
    expect(findStockShortages([{ productId: 'prod_1', skuId: 7, quantity: 3 }], products)).toEqual({
      prod_1: 'Chỉ còn 2 sản phẩm',
    });
    expect(findStockShortages([{ productId: 'prod_1', skuId: 7, quantity: 2 }], products)).toEqual({});
  });

  it('treats an unmatched skuId as 0 available', () => {
    const products = [
      product({ id: 'prod_1', skus: [{ id: 7, stockQuantity: 5 } as never] }),
    ];
    expect(findStockShortages([{ productId: 'prod_1', skuId: 999, quantity: 1 }], products)).toEqual({
      prod_1: 'Chỉ còn 0 sản phẩm',
    });
  });

  it('falls back to shop-level stock for a skuId line when the product has no SKUs', () => {
    const products = [product({ id: 'prod_1', inventory: { availableStock: 4 } as ProductWithInventory['inventory'] })];
    expect(findStockShortages([{ productId: 'prod_1', skuId: 7, quantity: 4 }], products)).toEqual({});
  });

  it('treats a product missing from the fresh fetch as 0 available', () => {
    expect(findStockShortages([{ productId: 'prod_99', skuId: null, quantity: 1 }], [])).toEqual({
      prod_99: 'Chỉ còn 0 sản phẩm',
    });
  });
});

describe('unavailableProductId (CHECKOUT-INACTIVE-01)', () => {
  it('reads the product id out of the 400 message', () => {
    expect(
      unavailableProductId({ statusCode: 400, status: 400, message: 'Product prod_aB12 is not available' }),
    ).toBe('prod_aB12');
  });

  it('ignores every other failure', () => {
    for (const error of [
      { statusCode: 400, message: 'Insufficient stock for product prod_x' },
      { statusCode: 400, message: 'Product 42 is not available' },
      { statusCode: 400 },
      { message: 42 },
      null,
      'Product prod_x is not available',
    ]) {
      expect(unavailableProductId(error)).toBeNull();
    }
  });
});

describe('findInactiveLines (CHECKOUT-INACTIVE-01)', () => {
  const map = new Map<string, ProductWithInventory>([
    ['prod_off', product({ id: 'prod_off', isActive: false })],
    ['prod_on', product({ id: 'prod_on', isActive: true })],
    ['prod_legacy', product({ id: 'prod_legacy' })],
  ]);

  it('flags only lines whose product is explicitly deactivated', () => {
    const lines = ['prod_off', 'prod_on', 'prod_legacy', 'prod_missing'].map((productId) => ({
      productId,
      quantity: 1,
    }));
    expect(findInactiveLines(lines, map)).toEqual({
      prod_off: 'Sản phẩm đã ngừng bán — bỏ khỏi đơn để đặt hàng',
    });
  });

  it('words the flag in English', () => {
    expect(findInactiveLines([{ productId: 'prod_off', quantity: 1 }], map, 'en')).toEqual({
      prod_off: 'No longer sold — remove it from the order to continue',
    });
  });

  it('wins over a stock shortage in the pre-submit check', () => {
    const products = [
      product({ id: 'prod_off', isActive: false, inventory: { availableStock: 0 } as ProductWithInventory['inventory'] }),
      product({ id: 'prod_1', inventory: { availableStock: 1 } as ProductWithInventory['inventory'] }),
    ];
    expect(
      findStockShortages(
        [
          { productId: 'prod_off', skuId: null, quantity: 5 },
          { productId: 'prod_1', skuId: null, quantity: 2 },
        ],
        products,
      ),
    ).toEqual({
      prod_off: 'Sản phẩm đã ngừng bán — bỏ khỏi đơn để đặt hàng',
      prod_1: 'Chỉ còn 1 sản phẩm',
    });
  });
});

describe('checkoutItems — en (I18N-03)', () => {
  it('words the missing-name fallbacks in English', () => {
    expect(cartLineName(undefined, false, 'en')).toBe('This product no longer exists');
    expect(cartLineName(undefined, true, 'en')).toBe("Couldn't load the product name");
  });

  it('pluralises the stock shortage', () => {
    const stock = (n: number) => [
      product({ id: 'prod_1', inventory: { availableStock: n } as ProductWithInventory['inventory'] }),
    ];
    const line = [{ productId: 'prod_1', skuId: null, quantity: 9 }];
    expect(findStockShortages(line, stock(1), 'en')).toEqual({ prod_1: 'Only 1 item left' });
    expect(findStockShortages(line, stock(3), 'en')).toEqual({ prod_1: 'Only 3 items left' });
  });
});
