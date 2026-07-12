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
