import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().min(1, 'Nội dung không được để trống'),
});

export type CreatePostFormData = z.infer<typeof createPostSchema>;
