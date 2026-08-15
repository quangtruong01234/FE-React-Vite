import { api } from '@/api';
import type { UploadSignature } from '@/types';
import { outcomeFromError, outcomeFromResult, type DeleteMediaOutcome } from './deleteMediaOutcome';
import { buildChunkForm } from './signedUploadFields';
import { buildUploadId, planUploadChunks } from './uploadChunkPlan';
import { oversizeMessage, resolveUploadCap } from './uploadValidation';

export type UploadProgressCallback = (percent: number) => void;

export interface UploadResult {
  url: string;
  publicId: string;
}

async function uploadChunked(
  file: File,
  sig: UploadSignature,
  resourceType: 'image' | 'video',
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  // UPLOAD-SIZE-01: the signature carries the backend's ceiling, so honour that
  // number rather than the local constant. This also covers the asymmetry the
  // backend flagged: the signature is issued before a byte exists, so its own
  // check can only use the *folder* ceiling — an 11 MB image bound for
  // `trybuy/posts` clears the 100 MB video ceiling there and is caught only by a
  // per-type check like this one.
  const cap = resolveUploadCap(sig, resourceType);
  if (file.size > cap) throw new Error(oversizeMessage(resourceType, cap));

  const url = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`;
  const publicId = sig.public_id;
  const uploadId = buildUploadId(sig.timestamp, publicId);

  let secureUrl = '';
  let returnedPublicId = publicId;

  for (const { start, end, contentRange, percent } of planUploadChunks(file.size)) {
    const chunk = file.slice(start, end);

    const form = buildChunkForm(chunk, sig);

    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        'X-Unique-Upload-Id': uploadId,
        'Content-Range': contentRange,
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errBody.error?.message ?? 'Upload thất bại');
    }

    const json = (await res.json()) as { secure_url?: string; public_id?: string };
    if (json.secure_url) secureUrl = json.secure_url;
    if (json.public_id) returnedPublicId = json.public_id;

    onProgress?.(percent);
  }

  if (!secureUrl) throw new Error('Không nhận được URL sau khi upload');
  return { url: secureUrl, publicId: returnedPublicId };
}

const POSTS_FOLDER = 'trybuy/posts';
const PRODUCTS_FOLDER = 'trybuy/products';
const AVATARS_FOLDER = 'avatars';

// The signature endpoint derives the owner from the JWT cookie and returns an
// owner-prefixed `public_id`, so FE sends neither `userId` nor `publicId`:
// after the PUBID migration `user.id` is an opaque `usr_…` string, which the
// endpoint rejects ("userId must be an integer number"). The `_userId` arg is
// kept so call sites and their UP-06 login gate stay unchanged.
export async function uploadImage(
  file: File,
  _userId: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const sig = await api.upload.getSignature(POSTS_FOLDER);
  return uploadChunked(file, sig, 'image', onProgress);
}

export async function uploadVideo(
  file: File,
  _userId: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const sig = await api.upload.getSignature(POSTS_FOLDER);
  return uploadChunked(file, sig, 'video', onProgress);
}

export async function uploadProductImage(
  file: File,
  _userId: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const sig = await api.upload.getSignature(PRODUCTS_FOLDER);
  return uploadChunked(file, sig, 'image', onProgress);
}

export async function uploadAvatar(
  file: File,
  _userId: string,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const sig = await api.upload.getSignature(AVATARS_FOLDER);
  return uploadChunked(file, sig, 'image', onProgress);
}

/**
 * Best-effort orphan cleanup. Callers fire this and forget (`void deleteMedia(id)`),
 * so it must never reject — a `502/503` (Cloudinary/network) or `400/403`
 * (foreign/persisted id) leaves the asset as an orphan instead of throwing an
 * unhandled rejection. Returns the classified outcome for callers that want it.
 */
export async function deleteMedia(publicId: string): Promise<DeleteMediaOutcome> {
  try {
    const res = await api.upload.deleteMedia(publicId);
    return outcomeFromResult(res.result);
  } catch (error: unknown) {
    return outcomeFromError(error);
  }
}
