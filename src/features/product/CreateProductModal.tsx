import { useState, type ReactElement, type ChangeEvent, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormData {
  name: string;
  description: string;
  price: string;
  stockQuantity: string;
  sku: string;
  brandId: string;
  categoryId: string;
  imageUrl: string;
  sellerNotes: string;
  condition: string;
}

type FormErrors = Partial<Record<keyof FormData | 'submit', string>>;

interface CreateProductModalProps {
  onProductCreated: () => void;
  onCancel: () => void;
}

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

export default function CreateProductModal({ onProductCreated, onCancel }: CreateProductModalProps): ReactElement {
  const { currentUser } = useAuthContext();
  const [formData, setFormData] = useState<FormData>({
    name: '', description: '', price: '', stockQuantity: '', sku: '',
    brandId: '', categoryId: '', imageUrl: '', sellerNotes: '', condition: 'new',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const queryClient = useQueryClient();

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.products.getBrands(),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.products.getCategories(),
  });

  const dataLoading = brandsLoading || categoriesLoading;

  const { mutateAsync: createProduct, isPending: loading } = useMutation({
    mutationFn: (data: Parameters<typeof api.products.create>[0]) => api.products.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      onProductCreated();
    },
    onError: (err: unknown) => {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Lỗi tạo sản phẩm';
      setErrors({ submit: msg });
    },
  });

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function generateSKU(): void {
    if (formData.name) {
      const sku = formData.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15) + '_' + Date.now().toString().slice(-4);
      setFormData((prev) => ({ ...prev, sku }));
    }
  }

  function validateForm(): boolean {
    const errs: FormErrors = {};
    if (!formData.name.trim()) errs.name = 'Tên sản phẩm không được để trống';
    if (!formData.description.trim()) errs.description = 'Mô tả không được để trống';
    if (!formData.price || Number(formData.price) <= 0) errs.price = 'Giá phải lớn hơn 0';
    if (!formData.sku.trim()) errs.sku = 'SKU không được để trống';
    if (!formData.categoryId) errs.categoryId = 'Vui lòng chọn danh mục';
    if (!formData.stockQuantity || Number(formData.stockQuantity) < 0) errs.stockQuantity = 'Số lượng tồn kho không hợp lệ';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!validateForm()) return;
    await createProduct({
      name: formData.name,
      description: formData.description,
      price: parseInt(formData.price),
      stockQuantity: parseInt(formData.stockQuantity),
      sku: formData.sku,
      brandId: formData.brandId ? parseInt(formData.brandId) : undefined,
      categoryId: parseInt(formData.categoryId),
      condition: formData.condition,
      imageUrl: formData.imageUrl || undefined,
      sellerNotes: formData.sellerNotes || undefined,
      userId: currentUser?.id ?? 1,
      likesCount: 0, commentsCount: 0, sharesCount: 0, viewCount: 0,
      isFeatured: false, isTrending: false, rating: 0, ratingCount: 0,
    });
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
        <form onSubmit={(e) => void handleSubmit(e)} className="px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 mb-6">
            {/* Name */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-ink-pri">Tên sản phẩm *</Label>
              <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                placeholder="VD: iPhone 14 Pro Max"
                className={cn(fieldBase, errors.name && fieldError)} />
              {errors.name && <span className="text-xs text-accent-red font-medium">{errors.name}</span>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-ink-pri">Mô tả sản phẩm *</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange}
                placeholder="Mô tả chi tiết về sản phẩm..." rows={3}
                className={cn(fieldBase, 'resize-y min-h-[80px]', errors.description && fieldError)} />
              {errors.description && <span className="text-xs text-accent-red font-medium">{errors.description}</span>}
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price" className="text-ink-pri">Giá (VND) *</Label>
              <Input id="price" name="price" type="number" value={formData.price} onChange={handleChange}
                placeholder="30000000" min="0"
                className={cn(fieldBase, errors.price && fieldError)} />
              {errors.price && <span className="text-xs text-accent-red font-medium">{errors.price}</span>}
            </div>

            {/* Stock */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stockQuantity" className="text-ink-pri">Số lượng tồn kho *</Label>
              <Input id="stockQuantity" name="stockQuantity" type="number" value={formData.stockQuantity} onChange={handleChange}
                placeholder="100" min="0"
                className={cn(fieldBase, errors.stockQuantity && fieldError)} />
              {errors.stockQuantity && <span className="text-xs text-accent-red font-medium">{errors.stockQuantity}</span>}
            </div>

            {/* SKU */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sku" className="text-ink-pri">SKU (Mã sản phẩm) *</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input id="sku" name="sku" type="text" value={formData.sku} onChange={handleChange}
                  placeholder="IPHONE14PROMAX"
                  className={cn(fieldBase, 'flex-1', errors.sku && fieldError)} />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 rounded-lg text-sm font-medium cursor-pointer hover:-translate-y-px transition-transform whitespace-nowrap sm:self-auto">
                  🔄 Tự động tạo
                </button>
              </div>
              {errors.sku && <span className="text-xs text-accent-red font-medium">{errors.sku}</span>}
            </div>

            {/* Brand */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandId" className="text-ink-pri">Thương hiệu</Label>
              <select id="brandId" name="brandId" value={formData.brandId} onChange={handleChange}
                disabled={dataLoading} className={selectBase}>
                <option value="">{dataLoading ? '🔄 Đang tải...' : '-- Chọn thương hiệu --'}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{getBrandIcon(brand.name)} {brand.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId" className="text-ink-pri">Danh mục *</Label>
              <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange}
                disabled={dataLoading}
                className={cn(selectBase, errors.categoryId && 'border-accent-red focus:border-accent-red focus:ring-accent-red/30')}>
                <option value="">{dataLoading ? '🔄 Đang tải...' : '-- Chọn danh mục --'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className="text-xs text-accent-red font-medium">{errors.categoryId}</span>}
            </div>

            {/* Condition */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="condition" className="text-ink-pri">Tình trạng sản phẩm</Label>
              <select id="condition" name="condition" value={formData.condition} onChange={handleChange}
                className={selectBase}>
                <option value="new">🆕 Mới</option>
                <option value="used">📦 Đã sử dụng</option>
                <option value="refurbished">🔧 Tân trang</option>
              </select>
            </div>

            {/* Image URL */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imageUrl" className="text-ink-pri">URL hình ảnh</Label>
              <Input id="imageUrl" name="imageUrl" type="url" value={formData.imageUrl} onChange={handleChange}
                placeholder="https://..."
                className={fieldBase} />
            </div>

            {/* Seller notes */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sellerNotes" className="text-ink-pri">Ghi chú của người bán</Label>
              <Textarea id="sellerNotes" name="sellerNotes" value={formData.sellerNotes} onChange={handleChange}
                placeholder="Thông tin bảo hành, khuyến mãi..." rows={2}
                className={cn(fieldBase, 'resize-y min-h-[60px]')} />
            </div>
          </div>

          {errors.submit && (
            <div className="bg-accent-red text-white px-4 py-3 rounded-lg mb-5 font-medium text-sm">
              ❌ {errors.submit}
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
              disabled={loading}
              className="bg-gradient-to-br from-accent-pri to-accent-sec hover:opacity-90 text-white border-0 min-w-[140px] sm:w-auto w-full">
              {loading
                ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block mr-2" />Đang tạo...</>
                : '🚀 Tạo sản phẩm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
