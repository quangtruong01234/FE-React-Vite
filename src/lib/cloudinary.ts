import { api } from '@/api';
import type { UploadSignature } from '@/types';

const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB

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
  const url = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`;
  const publicId = sig.public_id;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `${sig.timestamp}_${publicId}`;

  let secureUrl = '';
  let returnedPublicId = publicId;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const form = new FormData();
    form.append('file', chunk);
    form.append('signature', sig.signature);
    form.append('timestamp', String(sig.timestamp));
    form.append('api_key', sig.api_key);
    form.append('folder', sig.folder);
    form.append('public_id', publicId);
    if (totalChunks > 1) {
      form.append('upload_id', uploadId);
    }

    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: {
        'X-Unique-Upload-Id': uploadId,
        'Content-Range': `bytes ${start}-${end - 1}/${file.size}`,
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errBody.error?.message ?? 'Upload thất bại');
    }

    const json = (await res.json()) as { secure_url?: string; public_id?: string };
    if (json.secure_url) secureUrl = json.secure_url;
    if (json.public_id) returnedPublicId = json.public_id;

    onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
  }

  if (!secureUrl) throw new Error('Không nhận được URL sau khi upload');
  return { url: secureUrl, publicId: returnedPublicId };
}

const POSTS_FOLDER = 'trybuy/posts';
const PRODUCTS_FOLDER = 'trybuy/products';

function makePublicId(folder: string, userId: number): string {
  return `${folder}/${userId}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function uploadImage(
  file: File,
  userId: number,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const publicId = makePublicId(POSTS_FOLDER, userId);
  const sig = await api.upload.getSignature(POSTS_FOLDER, userId, publicId);
  return uploadChunked(file, sig, 'image', onProgress);
}

export async function uploadVideo(
  file: File,
  userId: number,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const publicId = makePublicId(POSTS_FOLDER, userId);
  const sig = await api.upload.getSignature(POSTS_FOLDER, userId, publicId);
  return uploadChunked(file, sig, 'video', onProgress);
}

export async function uploadProductImage(
  file: File,
  userId: number,
  onProgress?: UploadProgressCallback,
): Promise<UploadResult> {
  const publicId = makePublicId(PRODUCTS_FOLDER, userId);
  const sig = await api.upload.getSignature(PRODUCTS_FOLDER, userId, publicId);
  return uploadChunked(file, sig, 'image', onProgress);
}

export async function deleteMedia(publicId: string): Promise<void> {
  await api.upload.deleteMedia(publicId);
}
