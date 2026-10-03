import { z } from 'zod';
import { socialMsg } from './social.i18n';

export const createPostSchema = z.object({
  content: z.string().min(1, socialMsg('contentRequired')),
});

export type CreatePostFormData = z.infer<typeof createPostSchema>;
