import { useEffect, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { api } from '@/api';
import { queryKeys } from '@/hooks/queryKeys';
import { useAuthContext } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { cn } from '@/lib/utils';
import { uploadProductImage, deleteMedia } from '@/lib/cloudinary';
import { createProductSchema, type CreateProductFormData } from './product.schema';

const MAX_IMAGES = 5;

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

interface ImageItem {
  url: string;
  publicId: string;
}

interface UploadState {
  active: boolean;
  percent: number;
  error: string | null;
}

interface VariationAxis {
  name: string;
  optionsText: string;
}

interface SkuRow {
  tierIdx: string;
  label: string;
  price: string;
  stock: string;
  sku: string;
}

export default function CreateProductModal({ onProductCreated, onCancel }: CreateProductModalProps): ReactElement {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [upload, setUpload] = useState<UploadState>({ active: false, percent: 0, error: null });
  const [hasVariations, setHasVariations] = useState(false);
  const [variationAxes, setVariationAxes] = useState<VariationAxis[]>([]);
  const [skuRows, setSkuRows] = useState<SkuRow[]>([]);
  const [variantError, setVariantError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema) as Resolver<CreateProductFormData>,
    defaultValues: { condition: 'new', isActive: true, categoryIds: [] },
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: () => api.products.getBrands(),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api.products.getCategories(),
  });

  // Auto-generate SKU matrix as cartesian product of variation options.
  // Preserves user-entered price/stock/sku for combinations that still exist (same tierIdx).
  useEffect(() => {
    if (!hasVariations || variationAxes.length === 0) {
      setSkuRows([]);
      return;
    }

    const axes = variationAxes.map(a =>
      a.optionsText.split(',').map(s => s.trim()).filter(Boolean),
    );

    if (axes.some(a => a.length === 0)) {
      setSkuRows([]);
      return;
    }

    let combos: number[][] = [[]];
    axes.forEach(opts => {
      combos = combos.flatMap(prev => opts.map((_, i) => [...prev, i]));
    });

    const generated = combos.map(indices => ({
      tierIdx: JSON.stringify(indices),
      label: indices.map((idx, axisIdx) => axes[axisIdx][idx]).join(' / '),
      price: '',
      stock: '',
      sku: '',
    }));

    setSkuRows(prev => {
      const prevMap = new Map(prev.map(r => [r.tierIdx, r]));
      return generated.map(row => {
        const existing = prevMap.get(row.tierIdx);
        return existing
          ? { ...row, price: existing.price, stock: existing.stock, sku: existing.sku }
          : row;
      });
    });
  }, [variationAxes, hasVariations]);

  const { mutateAsync: createProductMutate, isPending: loading } = useMutation({
    mutationFn: async (data: CreateProductFormData) => {
      if (hasVariations) {
        const variations = variationAxes.map(a => ({
          name: a.name,
          options: a.optionsText.split(',').map(s => s.trim()).filter(Boolean),
        }));
        const skuList = skuRows.map(r => ({
          tierIdx: r.tierIdx,
          price: Number(r.price),
          stockQuantity: r.stock !== '' ? Number(r.stock) : undefined,
          sku: r.sku.trim() || undefined,
          isActive: true,
        }));
        return await api.products.create({
          name: data.name,
          description: data.description,
          categoryIds: data.categoryIds,
          brandId: data.brandId,
          condition: data.condition,
          sellerNotes: data.sellerNotes || undefined,
          weight: data.weight,
          isActive: data.isActive,
          image_urls: imageItems.length > 0 ? imageItems.map(i => i.url) : undefined,
          variations,
          skuList,
        });
      }

      // Simple product (no variations)
      const price = data.price;
      const stockQuantity = data.stockQuantity;
      const sku = data.sku;
      if (price === undefined || stockQuantity === undefined || !sku) {
        throw new Error('Thiếu thông tin giá, tồn kho hoặc SKU');
      }

      const product = await api.products.create({
        name: data.name,
        description: data.description,
        price,
        stockQuantity,
        sku,
        categoryIds: data.categoryIds,
        brandId: data.brandId,
        condition: data.condition,
        sellerNotes: data.sellerNotes || undefined,
        weight: data.weight,
        isActive: data.isActive,
        image_urls: imageItems.length > 0 ? imageItems.map(i => i.url) : undefined,
      });

      await api.inventory.create({
        productId: Number(product.id),
        sku: product.sku,
        availableStock: stockQuantity,
        minimumStock: data.minimumStock ?? 5,
        location: 'Kho mặc định',
        isActive: true,
      });

      return product;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      setImageItems([]);
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

  function handleCancel(): void {
    imageItems.forEach(img => { void deleteMedia(img.publicId); });
    onCancel();
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const available = MAX_IMAGES - imageItems.length;
    const toUpload = files.slice(0, available);
    if (!toUpload.length) return;

    setUpload({ active: true, percent: 0, error: null });
    try {
      const uploaded: ImageItem[] = [];
      for (let i = 0; i < toUpload.length; i++) {
        const result = await uploadProductImage(toUpload[i], currentUser?.id ?? 0, (p) => {
          const base = (i / toUpload.length) * 100;
          setUpload(prev => ({ ...prev, percent: Math.round(base + p / toUpload.length) }));
        });
        uploaded.push({ url: result.url, publicId: result.publicId });
      }
      setImageItems(prev => [...prev, ...uploaded]);
    } catch (err: unknown) {
      setUpload(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload ảnh thất bại',
      }));
    } finally {
      setUpload(prev => ({ ...prev, active: false, percent: 0 }));
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function removeImage(index: number): void {
    const item = imageItems[index];
    if (item) void deleteMedia(item.publicId);
    setImageItems(prev => prev.filter((_, i) => i !== index));
  }

  function toggleHasVariations(checked: boolean): void {
    setHasVariations(checked);
    if (!checked) {
      setVariationAxes([]);
      setSkuRows([]);
      setVariantError(null);
    } else {
      setVariationAxes([{ name: '', optionsText: '' }]);
    }
  }

  function addAxis(): void {
    setVariationAxes(prev => [...prev, { name: '', optionsText: '' }]);
  }

  function removeAxis(index: number): void {
    setVariationAxes(prev => prev.filter((_, i) => i !== index));
  }

  function updateAxis(index: number, field: keyof VariationAxis, value: string): void {
    setVariationAxes(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  }

  function updateSkuRow(index: number, field: 'price' | 'stock' | 'sku', value: string): void {
    setSkuRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  async function onSubmit(data: CreateProductFormData): Promise<void> {
    try {
      if (!hasVariations) {
        let hasError = false;
        if (!data.price || data.price <= 0) {
          setError('price', { message: 'Giá phải lớn hơn 0' });
          hasError = true;
        }
        if (data.stockQuantity === undefined || data.stockQuantity < 0) {
          setError('stockQuantity', { message: 'Số lượng tồn kho không hợp lệ' });
          hasError = true;
        }
        if (!data.sku?.trim()) {
          setError('sku', { message: 'SKU không được để trống' });
          hasError = true;
        }
        if (hasError) return;
      } else {
        if (variationAxes.length === 0) {
          setVariantError('Vui lòng thêm ít nhất một biến thể');
          return;
        }
        if (variationAxes.some(a => !a.name.trim() || !a.optionsText.trim())) {
          setVariantError('Vui lòng điền đầy đủ tên và tùy chọn cho tất cả biến thể');
          return;
        }
        if (skuRows.length === 0) {
          setVariantError('Không có tổ hợp SKU nào. Hãy thêm tùy chọn cho các biến thể');
          return;
        }
        if (skuRows.some(r => !r.price || Number(r.price) <= 0)) {
          setVariantError('Vui lòng điền giá (> 0) cho tất cả các tổ hợp biến thể');
          return;
        }
        setVariantError(null);
      }

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
          <h2 className="m-0 text-2xl font-semibold text-ink-pri">Tạo sản phẩm mới</h2>
          <ModalCloseButton onClick={handleCancel} />
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

            {/* Variation toggle + section */}
            <div className="sm:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="hasVariations"
                  checked={hasVariations}
                  onChange={e => toggleHasVariations(e.target.checked)}
                  className="size-4 rounded border-bdr accent-accent-pri shrink-0 cursor-pointer"
                />
                <Label htmlFor="hasVariations" className="text-ink-pri font-normal cursor-pointer">
                  Sản phẩm có biến thể (màu sắc, kích thước, v.v.)
                </Label>
              </div>

              {hasVariations && (
                <div className="flex flex-col gap-4 p-4 border border-bdr rounded-lg bg-canvas-elevated">
                  {/* Axes */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-ink-pri font-medium text-sm">Tên biến thể và tùy chọn</Label>
                    {variationAxes.map((axis, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          type="text"
                          placeholder="Tên (VD: Màu)"
                          value={axis.name}
                          onChange={e => updateAxis(index, 'name', e.target.value)}
                          className={cn(fieldBase, 'text-sm w-32 shrink-0')}
                        />
                        <Input
                          type="text"
                          placeholder="Tùy chọn cách nhau bằng dấu phẩy (VD: Đỏ, Xanh, Vàng)"
                          value={axis.optionsText}
                          onChange={e => updateAxis(index, 'optionsText', e.target.value)}
                          className={cn(fieldBase, 'text-sm flex-1')}
                        />
                        <button
                          type="button"
                          onClick={() => removeAxis(index)}
                          className="size-8 grid place-items-center rounded-full hover:bg-canvas-surface shrink-0"
                        >
                          <X size={14} className="shrink-0 text-ink-muted" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addAxis}
                      className="flex items-center gap-1.5 text-sm text-accent-pri hover:opacity-80 font-medium self-start transition-opacity"
                    >
                      <Plus size={14} className="shrink-0" />
                      Thêm biến thể
                    </button>
                  </div>

                  {/* SKU matrix */}
                  {skuRows.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Label className="text-ink-pri font-medium text-sm">
                        Giá và tồn kho theo tổ hợp biến thể ({skuRows.length} tổ hợp)
                      </Label>
                      <div className="overflow-x-auto rounded-md border border-bdr">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-bdr bg-canvas-surface">
                              <th className="text-left px-3 py-2 font-medium text-ink-sec whitespace-nowrap">Biến thể</th>
                              <th className="text-left px-3 py-2 font-medium text-ink-sec whitespace-nowrap">Giá (VND) *</th>
                              <th className="text-left px-3 py-2 font-medium text-ink-sec whitespace-nowrap">Tồn kho</th>
                              <th className="text-left px-3 py-2 font-medium text-ink-sec whitespace-nowrap">SKU</th>
                            </tr>
                          </thead>
                          <tbody>
                            {skuRows.map((row, i) => (
                              <tr key={row.tierIdx} className={cn('border-b border-bdr last:border-0', i % 2 === 1 && 'bg-canvas-surface/30')}>
                                <td className="px-3 py-2 text-ink-pri font-medium whitespace-nowrap">{row.label}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    placeholder="Nhập giá"
                                    min="0"
                                    value={row.price}
                                    onChange={e => updateSkuRow(i, 'price', e.target.value)}
                                    className={cn(fieldBase, 'text-sm w-32')}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={row.stock}
                                    onChange={e => updateSkuRow(i, 'stock', e.target.value)}
                                    className={cn(fieldBase, 'text-sm w-24')}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="text"
                                    placeholder="Tùy chọn"
                                    value={row.sku}
                                    onChange={e => updateSkuRow(i, 'sku', e.target.value)}
                                    className={cn(fieldBase, 'text-sm w-32')}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {variantError && (
                    <p className="text-xs text-accent-red font-medium">{variantError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Price — hidden when hasVariations */}
            {!hasVariations && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price" className="text-ink-pri">Giá (VND) *</Label>
                <Input id="price" type="number" placeholder="30000000" min="0"
                  {...register('price')}
                  className={cn(fieldBase, errors.price && fieldError)} />
                {errors.price && <span className="text-xs text-accent-red font-medium">{errors.price.message}</span>}
              </div>
            )}

            {/* Stock — hidden when hasVariations */}
            {!hasVariations && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stockQuantity" className="text-ink-pri">Số lượng tồn kho *</Label>
                <Input id="stockQuantity" type="number" placeholder="100" min="0"
                  {...register('stockQuantity')}
                  className={cn(fieldBase, errors.stockQuantity && fieldError)} />
                {errors.stockQuantity && <span className="text-xs text-accent-red font-medium">{errors.stockQuantity.message}</span>}
              </div>
            )}

            {/* SKU — hidden when hasVariations */}
            {!hasVariations && (
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
            )}

            {/* Categories */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label className="text-ink-pri">Danh mục *</Label>
              <Controller
                name="categoryIds"
                control={control}
                render={({ field }) => (
                  <div className={cn(
                    'border rounded-md bg-canvas-elevated p-2 max-h-40 overflow-y-auto flex flex-col gap-0.5',
                    errors.categoryIds ? 'border-accent-red' : 'border-bdr',
                  )}>
                    {categoriesLoading ? (
                      <p className="text-sm text-ink-sec px-1.5 py-1">🔄 Đang tải danh mục...</p>
                    ) : categories.length === 0 ? (
                      <p className="text-sm text-ink-muted px-1.5 py-1">Không có danh mục</p>
                    ) : (
                      categories.map(cat => {
                        const catIdNum = Number(cat.id);
                        const checked = (field.value ?? []).includes(catIdNum);
                        return (
                          <label
                            key={cat.id}
                            className="flex items-center gap-2.5 px-1.5 py-1 rounded hover:bg-canvas-surface cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const curr = field.value ?? [];
                                field.onChange(
                                  checked
                                    ? curr.filter(id => id !== catIdNum)
                                    : [...curr, catIdNum],
                                );
                              }}
                              className="rounded border-bdr accent-accent-pri shrink-0"
                            />
                            <span className="text-sm text-ink-pri">{cat.name}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              />
              {errors.categoryIds && (
                <span className="text-xs text-accent-red font-medium">Vui lòng chọn ít nhất một danh mục</span>
              )}
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
                    disabled={brandsLoading}
                    className={selectBase}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}>
                    <option value="">{brandsLoading ? '🔄 Đang tải...' : '-- Chọn thương hiệu --'}</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{getBrandIcon(brand.name)} {brand.name}</option>
                    ))}
                  </select>
                )}
              />
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

            {/* Weight */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weight" className="text-ink-pri">Trọng lượng (gram)</Label>
              <Input id="weight" type="number" placeholder="500" min="0"
                {...register('weight')}
                className={cn(fieldBase, errors.weight && fieldError)} />
              {errors.weight && <span className="text-xs text-accent-red font-medium">{errors.weight.message}</span>}
            </div>

            {/* Minimum stock — hidden when hasVariations (stock is per-SKU) */}
            {!hasVariations && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minimumStock" className="text-ink-pri">Tồn kho tối thiểu</Label>
                <Input id="minimumStock" type="number" placeholder="5" min="0"
                  {...register('minimumStock')}
                  className={cn(fieldBase, errors.minimumStock && fieldError)} />
                {errors.minimumStock && <span className="text-xs text-accent-red font-medium">{errors.minimumStock.message}</span>}
              </div>
            )}

            {/* Image upload */}
            <div className="sm:col-span-2 flex flex-col gap-2">
              <Label className="text-ink-pri">Hình ảnh sản phẩm (tối đa {MAX_IMAGES})</Label>

              {imageItems.length > 0 && (
                <div className={cn(
                  'grid gap-2',
                  imageItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4',
                )}>
                  {imageItems.map((item, i) => (
                    <div key={item.url} className="relative group aspect-square rounded-tb-card overflow-hidden bg-canvas-elevated">
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 size-6 grid place-items-center rounded-full bg-black/60 border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} className="shrink-0 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {upload.active && (
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 bg-canvas-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-amber transition-all duration-200 rounded-full"
                      style={{ width: `${upload.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-muted font-body">{upload.percent}% đã tải lên</p>
                </div>
              )}

              {upload.error && <p className="text-xs text-accent-red">{upload.error}</p>}

              {imageItems.length < MAX_IMAGES && (
                <button
                  type="button"
                  disabled={upload.active}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-bdr text-ink-sec text-sm hover:border-accent-pri hover:text-accent-pri transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upload.active
                    ? <Loader2 size={16} className="shrink-0 animate-spin" />
                    : <ImagePlus size={16} className="shrink-0" />}
                  {upload.active ? 'Đang tải lên...' : `Thêm ảnh (${imageItems.length}/${MAX_IMAGES})`}
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { void handleImageSelect(e); }}
              />
            </div>

            {/* Seller notes */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sellerNotes" className="text-ink-pri">Ghi chú của người bán</Label>
              <Textarea id="sellerNotes" placeholder="Thông tin bảo hành, khuyến mãi..." rows={2}
                {...register('sellerNotes')}
                className={cn(fieldBase, 'resize-y min-h-[60px]')} />
            </div>

            {/* Is active */}
            <div className="sm:col-span-2 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="size-4 rounded border-bdr accent-accent-pri shrink-0 cursor-pointer"
              />
              <Label htmlFor="isActive" className="text-ink-pri font-normal cursor-pointer">
                Kích hoạt sản phẩm ngay sau khi tạo
              </Label>
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
              onClick={handleCancel}
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
