import { describe, it, expect } from 'vitest';
import { skuForPayload } from './productSku';

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
