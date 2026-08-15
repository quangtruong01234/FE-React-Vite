import { describe, expect, it } from 'vitest';
import { buildChunkForm, signedUploadFields } from './signedUploadFields';
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

describe('buildChunkForm', () => {
  const chunk = new Blob(['chunk-bytes']);

  it('carries the file plus exactly the signed fields — nothing unsigned (UP-05)', () => {
    const form = buildChunkForm(chunk, { ...baseSig, allowed_formats: 'jpg,png,webp' });
    expect([...form.keys()].sort()).toEqual([
      'allowed_formats', 'api_key', 'file', 'folder', 'public_id', 'signature', 'timestamp',
    ]);
  });

  it('never appends upload_id — an unsigned form param fails Cloudinary signature verification', () => {
    const form = buildChunkForm(chunk, baseSig);
    expect(form.has('upload_id')).toBe(false);
  });

  it('never forwards the backend-owned size caps (UPLOAD-SIZE-01) — they are unsigned', () => {
    const form = buildChunkForm(chunk, { ...baseSig, maxBytes: 10485760, maxVideoBytes: 104857600 });
    expect(form.has('maxBytes')).toBe(false);
    expect(form.has('maxVideoBytes')).toBe(false);
  });

  it('sends the chunk under the file key with the signed values verbatim', () => {
    const form = buildChunkForm(chunk, baseSig);
    expect(form.get('file')).toBeInstanceOf(Blob);
    expect(form.get('signature')).toBe('abc123');
    expect(form.get('public_id')).toBe('18_ab12cd');
  });
});
