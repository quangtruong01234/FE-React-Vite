import type { UploadSignature } from '@/types';
import { request, toQuery } from './client';

export const uploadApi = {
  // No `userId`/`publicId` params: the backend derives the owner from the JWT
  // cookie and returns an owner-prefixed `public_id` (it rejects opaque
  // `usr_…` ids with "userId must be an integer number").
  getSignature: (folder: string): Promise<UploadSignature> => {
    const qs = toQuery({ folder });
    return request<UploadSignature>(`/upload/signature${qs}`, { method: 'POST' });
  },

  deleteMedia: (public_id: string): Promise<{ result: string }> =>
    request<{ result: string }>('/upload/media', {
      method: 'DELETE',
      body: JSON.stringify({ public_id }),
    }),
};
