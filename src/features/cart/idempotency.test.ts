import { describe, expect, it } from "vitest";
import { buildCheckoutSignature, resolveIdempotencyKey } from "./idempotency";

describe("buildCheckoutSignature", () => {
  it("is independent of item order", () => {
    const a = buildCheckoutSignature([
      { productId: 'prod_1', quantity: 2, skuId: 5 },
      { productId: 'prod_3', quantity: 1 },
    ]);
    const b = buildCheckoutSignature([
      { productId: 'prod_3', quantity: 1 },
      { productId: 'prod_1', quantity: 2, skuId: 5 },
    ]);
    expect(a).toBe(b);
  });

  it("changes when quantity changes", () => {
    const a = buildCheckoutSignature([{ productId: 'prod_1', quantity: 2 }]);
    const b = buildCheckoutSignature([{ productId: 'prod_1', quantity: 3 }]);
    expect(a).not.toBe(b);
  });

  it("distinguishes a missing SKU from a present one", () => {
    const a = buildCheckoutSignature([{ productId: 'prod_1', quantity: 1 }]);
    const b = buildCheckoutSignature([{ productId: 'prod_1', quantity: 1, skuId: 0 }]);
    expect(a).not.toBe(b);
  });
});

describe("resolveIdempotencyKey", () => {
  it("reuses the key while the signature is unchanged", () => {
    let n = 0;
    const gen = (): string => `key-${++n}`;
    const first = resolveIdempotencyKey(null, "sig-a", gen);
    const again = resolveIdempotencyKey(first, "sig-a", gen);
    expect(again).toBe(first);
    expect(again.key).toBe("key-1");
  });

  it("generates a new key when the signature changes", () => {
    let n = 0;
    const gen = (): string => `key-${++n}`;
    const first = resolveIdempotencyKey(null, "sig-a", gen);
    const next = resolveIdempotencyKey(first, "sig-b", gen);
    expect(next.key).toBe("key-2");
    expect(next.signature).toBe("sig-b");
  });
});
