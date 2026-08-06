import type { UploadSignature } from '@/types';

/**
 * FormData fields that participate in the Cloudinary SHA1 signature.
 * The set must mirror what the backend signed EXACTLY: `allowed_formats`
 * (SEC-M8) is signed when present, so omitting it — or sending it when the
 * backend didn't return one — produces an "Invalid Signature" rejection.
 */
export function signedUploadFields(sig: UploadSignature): Record<string, string> {
  const fields: Record<string, string> = {
    signature: sig.signature,
    timestamp: String(sig.timestamp),
    api_key: sig.api_key,
    folder: sig.folder,
    public_id: sig.public_id,
  };
  if (sig.allowed_formats) {
    fields.allowed_formats = sig.allowed_formats;
  }
  return fields;
}

/**
 * Builds the FormData for one chunk of a (possibly chunked) Cloudinary upload.
 * Cloudinary verifies the SHA1 signature over EVERY form param except `file`,
 * `api_key` and `signature`, so the form must carry the signed fields and
 * nothing else. UP-05: an extra unsigned `upload_id` form field made every
 * multi-chunk (>6MB) upload fail with "Invalid Signature" — chunk association
 * rides the `X-Unique-Upload-Id` header instead, never the form.
 */
export function buildChunkForm(chunk: Blob, sig: UploadSignature): FormData {
  const form = new FormData();
  form.append('file', chunk);
  for (const [key, value] of Object.entries(signedUploadFields(sig))) {
    form.append(key, value);
  }
  return form;
}
