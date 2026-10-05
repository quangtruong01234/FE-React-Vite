import { describe, expect, it } from "vitest";
import { buildCheckoutSignature, isOrderOutcomeUnknown, resolveIdempotencyKey } from "./idempotency";

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

describe("isOrderOutcomeUnknown", () => {
  const apiError = (status: number, message = "x") => ({ statusCode: status, status, message });

  it("treats a timeout or any 5xx as unknown — the order may still commit", () => {
    for (const status of [408, 500, 502, 503, 504]) {
      expect(isOrderOutcomeUnknown(apiError(status))).toBe(true);
    }
  });

  it("treats a failure with no HTTP answer as unknown", () => {
    expect(isOrderOutcomeUnknown(new TypeError("Failed to fetch"))).toBe(true);
    expect(isOrderOutcomeUnknown(new SyntaxError("Unexpected end of JSON input"))).toBe(true);
    expect(isOrderOutcomeUnknown(undefined)).toBe(true);
  });

  it("treats the held-key 409 as unknown", () => {
    expect(
      isOrderOutcomeUnknown(apiError(409, "A duplicate order request is already being processed")),
    ).toBe(true);
  });

  it("treats the held-key 409 as unknown by its errorCode, whatever the message (IDEM-HOLD-CODE-01)", () => {
    expect(
      isOrderOutcomeUnknown({ ...apiError(409, "Conflict"), errorCode: "ORDER_REQUEST_IN_PROGRESS" }),
    ).toBe(true);
  });

  it("does not trust the errorCode outside a 409", () => {
    expect(
      isOrderOutcomeUnknown({ ...apiError(400), errorCode: "ORDER_REQUEST_IN_PROGRESS" }),
    ).toBe(false);
  });

  it("keeps every definite rejection definite, other 409s included", () => {
    expect(isOrderOutcomeUnknown(apiError(409, "Insufficient stock for product prod_x"))).toBe(false);
    expect(isOrderOutcomeUnknown(apiError(409))).toBe(false);
    for (const status of [400, 401, 403, 404, 429]) {
      expect(isOrderOutcomeUnknown(apiError(status))).toBe(false);
    }
  });
});
