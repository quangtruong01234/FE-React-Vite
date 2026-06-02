import { type ReactElement } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createProductSchema, type CreateProductFormData } from './product.schema';

const getBrandIcon = (brandName: string): string => {
  const name = brandName.toLowerCase();
  if (name.includes('apple')) return '🍎';
  if (name.includes('samsung')) return '📱';
  if (name.includes('nike')) return '👟';
  if (name.includes('adidas')) return '⚡';
  if (name.includes('sony')) return '🎮';
  if (name.includes('lg')) return '📺';
  if (name.includes('dell')) return '💻';
  if (name.includes('hp')) return '🖨️';
  return '🏷️';
};

const fieldBase = 'bg-canvas-elevated border-bdr text-ink-pri placeholder:text-ink-sec focus-visible:ring-1 focus-visible:ring-accent-pri/50 focus-visible:border-accent-pri';
const fieldError = 'border-accent-red focus-visible:ring-accent-red/30 focus-visible:border-accent-red';
const selectBase = 'w-full px-3.5 py-2.5 rounded-md border border-bdr bg-canvas-elevated text-ink-pri text-sm outline-none focus:border-accent-pri focus:ring-1 focus:ring-accent-pri/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

interface CreateProductModalProps {
  onProductCreated: () => void;
  onCancel: () => void;
}

export default function CreateProductModal({ onProductCreated, onCancel }: CreateProductModalProps): ReactElement {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { condition: 'new' },
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.products.getBrands(),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.products.getCategories(),
  });

  const dataLoading = brandsLoading || categoriesLoading;

  const { mutateAsync: createProductMutate, isPending: loading } = useMutation({
    mutationFn: (data: CreateProductFormData) =>
      api.products.create({
        name: data.name,
        description: data.description,
        price: data.price,
        stockQuantity: data.stockQuantity,
        sku: data.sku,
        brandId: data.brandId,
        categoryId: data.categoryId,
        condition: data.condition,
        imageUrl: data.imageUrl || undefined,
        sellerNotes: data.sellerNotes || undefined,
        userId: currentUser?.id ?? 1,
        isFeatured: false,
        isTrending: false,
        rating: 0,
        ratingCount: 0,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewCount: 0,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      onProductCreated();
    },
  });

  function generateSKU(): void {
    const name = getValues('name');
    if (name) {
      const sku = name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15) + '_' + Date.now().toString().slice(-4);
      setValue('sku', sku, { shouldValidate: true });
    }
  }

  async function onSubmit(data: CreateProductFormData): Promise<void> {
    try {
      await createProductMutate(data);
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Lỗi tạo sản phẩm';
      setError('root', { message: msg });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-5">
      <div className="bg-canvas-surface border border-bdr rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-8 pt-6 pb-5 border-b border-bdr">
          <h2 className="m-0 text-2xl font-semibold text-ink-pri">📝 Tạo sản phẩm mới</h2>
          <button
            type="button"
            onClick={onCancel}
            className="bg-transparent border-0 text-2xl text-ink-sec cursor-pointer p-2 rounded-lg hover:bg-canvas-elevated hover:text-ink-pri transition-colors leading-none">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 mb-6">
            {/* Name */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-ink-pri">Tên sản phẩm *</Label>
              <Input id="name" type="text" placeholder="VD: iPhone 14 Pro Max"
                {...register('name')}
                className={cn(fieldBase, errors.name && fieldError)} />
              {errors.name && <span className="text-xs text-accent-red font-medium">{errors.name.message}</span>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-ink-pri">Mô tả sản phẩm *</Label>
              <Textarea id="description" placeholder="Mô tả chi tiết về sản phẩm..." rows={3}
                {...register('description')}
                className={cn(fieldBase, 'resize-y min-h-[80px]', errors.description && fieldError)} />
              {errors.description && <span className="text-xs text-accent-red font-medium">{errors.description.message}</span>}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price" className="text-ink-pri">Giá (VND) *</Label>
              <Input id="price" type="number" placeholder="30000000" min="0"
                {...register('price')}
                className={cn(fieldBase, errors.price && fieldError)} />
              {errors.price && <span className="text-xs text-accent-red font-medium">{errors.price.message}</span>}
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stockQuantity" className="text-ink-pri">Số lượng tồn kho *</Label>
              <Input id="stockQuantity" type="number" placeholder="100" min="0"
                {...register('stockQuantity')}
                className={cn(fieldBase, errors.stockQuantity && fieldError)} />
              {errors.stockQuantity && <span className="text-xs text-accent-red font-medium">{errors.stockQuantity.message}</span>}
            </div>

            {/* SKU */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sku" className="text-ink-pri">SKU (Mã sản phẩm) *</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input id="sku" type="text" placeholder="IPHONE14PROMAX"
                  {...register('sku')}
                  className={cn(fieldBase, 'flex-1', errors.sku && fieldError)} />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 rounded-lg text-sm font-medium cursor-pointer hover:-translate-y-px transition-transform whitespace-nowrap sm:self-auto">
                  🔄 Tự động tạo
                </button>
              </div>
              {errors.sku && <span className="text-xs text-accent-red font-medium">{errors.sku.message}</span>}
            </div>

            {/* Brand */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandId" className="text-ink-pri">Thương hiệu</Label>
              <Controller
                name="brandId"
                control={control}
                render={({ field }) => (
                  <select
                    id="brandId"
                    disabled={dataLoading}
                    className={selectBase}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
                    <option value="">{dataLoading ? '🔄 Đang tải...' : '-- Chọn thương hiệu --'}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{getBrandIcon(brand.name)} {brand.name}</option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId" className="text-ink-pri">Danh mục *</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <select
                    id="categoryId"
                    disabled={dataLoading}
                    className={cn(selectBase, errors.categoryId && 'border-accent-red focus:border-accent-red focus:ring-accent-red/30')}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
                    <option value="">{dataLoading ? '🔄 Đang tải...' : '-- Chọn danh mục --'}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.categoryId && <span className="text-xs text-accent-red font-medium">{errors.categoryId.message}</span>}
            </div>

            {/* Condition */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="condition" className="text-ink-pri">Tình trạng sản phẩm</Label>
              <Controller
                name="condition"
                control={control}
                render={({ field }) => (
                  <select id="condition" className={selectBase} value={field.value} onChange={field.onChange}>
                    <option value="new">🆕 Mới</option>
                    <option value="used">📦 Đã sử dụng</option>
                    <option value="refurbished">🔧 Tân trang</option>
                  </select>
                )}
              />
            </div>

            {/* Image URL */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imageUrl" className="text-ink-pri">URL hình ảnh</Label>
              <Input id="imageUrl" type="url" placeholder="https://..."
                {...register('imageUrl')}
                className={fieldBase} />
            </div>

            {/* Seller notes */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sellerNotes" className="text-ink-pri">Ghi chú của người bán</Label>
              <Textarea id="sellerNotes" placeholder="Thông tin bảo hành, khuyến mãi..." rows={2}
                {...register('sellerNotes')}
                className={cn(fieldBase, 'resize-y min-h-[60px]')} />
            </div>
          </div>

          {errors.root && (
            <div className="bg-accent-red text-white px-4 py-3 rounded-lg mb-5 font-medium text-sm">
              ❌ {errors.root.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-5 border-t border-bdr">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 bg-canvas-elevated border border-bdr text-ink-sec rounded-lg font-medium text-sm cursor-pointer hover:bg-canvas-base hover:text-ink-pri transition-colors sm:w-auto w-full">
              Hủy bỏ
            </button>
            <Button
              type="submit"
              disabled={loading || isSubmitting}
              className="bg-gradient-to-br from-accent-pri to-accent-sec hover:opacity-90 text-white border-0 min-w-[140px] sm:w-auto w-full">
              {loading || isSubmitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />Đang tạo...</>
                : '🚀 Tạo sản phẩm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
