import { z } from 'zod';

const optionalPositiveNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().positive('Phải lớn hơn 0').optional(),
);

const optionalNonNegativeNumber = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
  z.number().min(0, 'Không hợp lệ').optional(),
);

export const createProductSchema = z.object({
  name: z.string().min(3, 'Tên sản phẩm phải ít nhất 3 ký tự'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  price: optionalPositiveNumber,
  stockQuantity: optionalNonNegativeNumber,
  sku: z.string().optional(),
  brandId: z.coerce.number().optional(),
  categoryIds: z.array(z.number()).min(1, 'Vui lòng chọn ít nhất một danh mục'),
  condition: z.enum(['new', 'used', 'refurbished']).default('new'),
  sellerNotes: z.string().optional(),
  weight: optionalPositiveNumber,
  isActive: z.boolean().default(true),
  minimumStock: optionalNonNegativeNumber,
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;
