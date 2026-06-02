import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  price: z.coerce.number().min(1, 'Giá phải lớn hơn 0'),
  stockQuantity: z.coerce.number().min(0, 'Số lượng tồn kho không hợp lệ'),
  sku: z.string().min(1, 'SKU không được để trống'),
  brandId: z.coerce.number().optional(),
  categoryId: z.coerce.number().min(1, 'Vui lòng chọn danh mục'),
  condition: z.enum(['new', 'used', 'refurbished']).default('new'),
  imageUrl: z.string().optional(),
  sellerNotes: z.string().optional(),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;
