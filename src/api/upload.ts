import type { UploadSignature } from '@/types';
import { request, toQuery } from './client';

export const uploadApi = {
  getSignature: (folder: string, userId?: number, publicId?: string): Promise<UploadSignature> => {
    const qs = toQuery({ folder, userId, publicId });
    return request<UploadSignature>(`/upload/signature${qs}`, { method: 'POST' });
  },

  deleteMedia: (public_id: string): Promise<{ result: string }> =>
    request<{ result: string }>('/upload/media', {
      method: 'DELETE',
      body: JSON.stringify({ public_id }),
    }),
};
