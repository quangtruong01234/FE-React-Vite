import { describe, it, expect } from 'vitest';
import { skuForField, skuForPayload } from './productSku';

describe('skuForPayload', () => {
  it('omits a blank SKU so the backend auto-provisions PROD-<id>', () => {
    expect(skuForPayload('')).toBeUndefined();
  });

  it('omits a whitespace-only SKU', () => {
    expect(skuForPayload('   ')).toBeUndefined();
  });

  it('trims and keeps a typed SKU', () => {
    expect(skuForPayload('  IPH14-256-BLK  ')).toBe('IPH14-256-BLK');
  });

  it('preserves an already-clean SKU verbatim', () => {
    expect(skuForPayload('ABC123')).toBe('ABC123');
  });
});

describe('skuForField', () => {
  it('turns a null stored SKU into an empty field instead of crashing the edit form', () => {
    expect(skuForField(null)).toBe('');
    // The crash was downstream: the raw value flowed into skuForPayload().
    expect(() => skuForPayload(skuForField(null))).not.toThrow();
  });

  it('turns a missing stored SKU into an empty field', () => {
    expect(skuForField(undefined)).toBe('');
  });

  it('hydrates a stored SKU verbatim, untrimmed', () => {
    expect(skuForField(' IPH14-256-BLK ')).toBe(' IPH14-256-BLK ');
  });
});
