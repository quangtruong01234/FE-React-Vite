import { describe, expect, it } from 'vitest';
import { signedUploadFields } from './signedUploadFields';
import type { UploadSignature } from '@/types';

const baseSig: UploadSignature = {
  signature: 'abc123',
  timestamp: 1752200000,
  cloud_name: 'trybuy-cloud',
  api_key: 'key-1',
  folder: 'trybuy/products',
  public_id: '18_ab12cd',
};

describe('signedUploadFields', () => {
  it('returns exactly the signed params (no cloud_name, no file) when allowed_formats is absent', () => {
    expect(signedUploadFields(baseSig)).toEqual({
      signature: 'abc123',
      timestamp: '1752200000',
      api_key: 'key-1',
      folder: 'trybuy/products',
      public_id: '18_ab12cd',
    });
  });

  it('includes allowed_formats verbatim when the backend signed it (SEC-M8)', () => {
    const fields = signedUploadFields({ ...baseSig, allowed_formats: 'jpg,png,webp' });
    expect(fields.allowed_formats).toBe('jpg,png,webp');
  });

  it('omits allowed_formats when the backend returns an empty string', () => {
    const fields = signedUploadFields({ ...baseSig, allowed_formats: '' });
    expect('allowed_formats' in fields).toBe(false);
  });

  it('serializes timestamp as a string for FormData', () => {
    expect(signedUploadFields(baseSig).timestamp).toBe('1752200000');
  });
});
