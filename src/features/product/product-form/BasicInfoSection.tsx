import { useRef, useState, useEffect, type ReactElement, type ChangeEvent, type CSSProperties } from 'react';
import { ImagePlus, Loader2, X, RefreshCw, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/shared/IconButton';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { cn } from '@/lib/format/utils';
import { api } from '@/api';
import type { Brand, Category, ProductCondition } from '@/types';
import type { ImageItem, FormErrors } from './useProductForm';
import { proposalErrorMessage } from './proposalErrors';
import { mergeLocalOptions } from './localOptions';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import { uploadProductImage } from '@/lib/http/cloudinary';
import { cldImage } from '@/lib/http/cloudinaryUrl';

const MAX_IMAGES = 6;

const CONDITION_OPTIONS: { value: ProductCondition; label: string }[] = [
  { value: 'new', label: 'Mới' },
  { value: 'used', label: 'Đã dùng' },
  { value: 'refurbished', label: 'Tân trang' },
];

const inputCls = (hasError?: boolean) =>
  cn(
    'w-full bg-canvas-elevated border border-bdr rounded-tb-input',
    'px-3.5 py-2.5 text-ink-pri font-body text-sm placeholder:text-ink-muted',
    'outline-none transition-colors',
    'focus:border-accent-amber/50 focus:ring-2 focus:ring-accent-amber/20',
    hasError && 'border-accent-red focus:border-accent-red focus:ring-accent-red/20',
  );

interface Props {
  images: ImageItem[];
  uploadState: { active: boolean; percent: number; error: string | null };
  onAddImages: (files: File[], userId: string) => Promise<ImageItem[]>;
  onRemoveImage: (index: number) => void;
  userId: string;

  name: string;
  description: string;
  sku: string;
  brandId: number | null;
  categoryIds: number[];
  condition: ProductCondition;

  brands: Brand[];
  categories: Category[];
  brandsLoading: boolean;
  categoriesLoading: boolean;

  errors: FormErrors;

  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSkuChange: (v: string) => void;
  onBrandChange: (v: number | null) => void;
  onCategoryToggle: (id: number) => void;
  onConditionChange: (v: ProductCondition) => void;
}

export function BasicInfoSection({
  images,
  uploadState,
  onAddImages,
  onRemoveImage,
  userId,
  name,
  description,
  sku,
  brandId,
  categoryIds,
  condition,
  brands,
  categories,
  brandsLoading,
  categoriesLoading,
  errors,
  onNameChange,
  onDescriptionChange,
  onSkuChange,
  onBrandChange,
  onCategoryToggle,
  onConditionChange,
}: Props): ReactElement {
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Brand combobox state ---
  const [brandQuery, setBrandQuery] = useState('');
  const [brandOpen, setBrandOpen] = useState(false);
  const [localBrands, setLocalBrands] = useState<Brand[]>(() => mergeLocalOptions(brands, []));
  const [pendingBrandIds, setPendingBrandIds] = useState<Set<number>>(new Set());
  const [brandCreating, setBrandCreating] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  // keep localBrands in sync when the prop list updates (initial load) —
  // adjust-state-during-render, keyed on the prop list identity
  useResetOnChange(brands, () => {
    setLocalBrands(prev => mergeLocalOptions(brands, prev));
  });

  // close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent): void {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setBrandOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selectedBrand = localBrands.find(b => b.id === brandId) ?? null;

  const filteredBrands = brandQuery.trim()
    ? localBrands.filter(b => b.name.toLowerCase().includes(brandQuery.trim().toLowerCase()))
    : localBrands;

  const queryMatchesExact = localBrands.some(
    b => b.name.toLowerCase() === brandQuery.trim().toLowerCase(),
  );
  const showAddBrand = brandQuery.trim().length > 0 && !queryMatchesExact;

  async function handleCreateBrand(): Promise<void> {
    const trimmed = brandQuery.trim();
    if (!trimmed) return;
    setBrandCreating(true);
    setBrandError(null);
    try {
      const created = await api.products.createBrand({ name: trimmed });
      const id = Number(created.id);
      const brand: Brand = { id, name: created.name, description: created.description, isActive: created.isActive };
      setLocalBrands(prev => [...prev, brand]);
      setPendingBrandIds(prev => new Set(prev).add(id));
      onBrandChange(id);
      setBrandQuery('');
      setBrandOpen(false);
    } catch (error: unknown) {
      setBrandError(proposalErrorMessage('brand', error));
    } finally {
      setBrandCreating(false);
    }
  }

  function handleSelectBrand(brand: Brand): void {
    onBrandChange(brand.id);
    setBrandQuery('');
    setBrandOpen(false);
  }

  function handleClearBrand(): void {
    onBrandChange(null);
    setBrandQuery('');
  }

  // --- Category "add new" state ---
  const [localCategories, setLocalCategories] = useState<Category[]>(
    () => mergeLocalOptions(categories, []),
  );
  const [pendingCategoryIds, setPendingCategoryIds] = useState<Set<number>>(new Set());
  const [newCatInput, setNewCatInput] = useState('');
  const [catCreating, setCatCreating] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  useResetOnChange(categories, () => {
    setLocalCategories(prev => mergeLocalOptions(categories, prev));
  });

  async function handleCreateCategory(): Promise<void> {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    setCatCreating(true);
    setCatError(null);
    try {
      const created = await api.products.createCategory({ name: trimmed });
      const id = Number(created.id);
      const cat: Category = { id, name: created.name, description: created.description, isActive: created.isActive };
      setLocalCategories(prev => [...prev, cat]);
      setPendingCategoryIds(prev => new Set(prev).add(id));
      onCategoryToggle(id);
      setNewCatInput('');
    } catch (error: unknown) {
      setCatError(proposalErrorMessage('category', error));
    } finally {
      setCatCreating(false);
    }
  }

  // --- Image handlers ---
  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const available = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, available);
    if (!toUpload.length) return;
    void onAddImages(toUpload, userId);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  function generateSku(): void {
    if (!name.trim()) return;
    const generated =
      name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15) +
      '_' +
      Date.now().toString().slice(-4);
    onSkuChange(generated);
  }

  return (
    <>
      {/* Section 01: Images */}
      <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-bdr">
          <span className="size-7 rounded-full bg-accent-amber/10 grid place-items-center shrink-0">
            <span className="font-display font-bold text-xs text-accent-amber">01</span>
          </span>
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-ink-pri">
            Hình ảnh sản phẩm
          </h2>
          <span className="ml-auto text-xs text-ink-muted font-body">
            {images.length}/{MAX_IMAGES}
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {images.map((img, i) => (
              <div
                key={img.url}
                className={cn(
                  'relative group aspect-square rounded-tb-card overflow-hidden bg-canvas-elevated',
                  i === 0 && 'ring-2 ring-accent-amber/40',
                )}
              >
                <img src={cldImage(img.url, 400)} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-[9px] font-display font-bold uppercase tracking-wider bg-accent-amber text-canvas-base px-1.5 py-0.5 rounded-tb-pill">
                    Bìa
                  </span>
                )}
                <IconButton
                  onClick={() => onRemoveImage(i)}
                  className="absolute top-1 right-1 size-5 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} className="shrink-0 text-ink-pri" />
                </IconButton>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                disabled={uploadState.active}
                onClick={() => imageInputRef.current?.click()}
                className={cn(
                  'aspect-square rounded-tb-card border-2 border-dashed border-bdr',
                  'grid place-items-center flex-col gap-1 transition-colors',
                  'hover:border-accent-amber/50 hover:bg-accent-amber/5',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {uploadState.active ? (
                  <Loader2 size={20} className="shrink-0 text-ink-muted animate-spin" />
                ) : (
                  <ImagePlus size={20} className="shrink-0 text-ink-muted" />
                )}
              </button>
            )}
          </div>

          {uploadState.active && (
            <div className="mt-3 flex flex-col gap-1">
              <div className="h-1 bg-canvas-elevated rounded-full overflow-hidden">
                <div
                  style={{ '--p': `${uploadState.percent}%` } as CSSProperties}
                  className="h-full bg-accent-amber rounded-full transition-all duration-200 [width:var(--p)]"
                />
              </div>
              <p className="text-xs text-ink-muted font-body">{uploadState.percent}% đã tải lên</p>
            </div>
          )}
          {uploadState.error && (
            <p className="mt-2 text-xs text-accent-red font-body">{uploadState.error}</p>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Section 02: Basic info */}
      <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-bdr">
          <span className="size-7 rounded-full bg-accent-amber/10 grid place-items-center shrink-0">
            <span className="font-display font-bold text-xs text-accent-amber">02</span>
          </span>
          <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-ink-pri">
            Thông tin cơ bản
          </h2>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-ink-pri font-body text-sm">Tên sản phẩm *</Label>
            <Input
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder="VD: iPhone 14 Pro Max 256GB"
              className={inputCls(!!errors.name)}
            />
            {errors.name && <p className="text-xs text-accent-red font-body">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-ink-pri font-body text-sm">Mô tả sản phẩm</Label>
            <RichTextEditor
              value={description}
              onChange={onDescriptionChange}
              userId={userId}
              onUploadImage={uploadProductImage}
            />
          </div>

          {/* Categories */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-ink-pri font-body text-sm">Danh mục *</Label>
            <div
              className={cn(
                'border rounded-tb-input bg-canvas-elevated p-2 max-h-44 overflow-y-auto',
                errors.categoryIds ? 'border-accent-red' : 'border-bdr',
              )}
            >
              {categoriesLoading ? (
                <p className="text-sm text-ink-sec px-1.5 py-1 font-body">Đang tải danh mục...</p>
              ) : localCategories.length === 0 ? (
                <p className="text-sm text-ink-muted px-1.5 py-1 font-body">Không có danh mục</p>
              ) : (
                localCategories.map(cat => {
                  const catId = Number(cat.id);
                  const checked = categoryIds.includes(catId);
                  const isPending = pendingCategoryIds.has(catId);
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-tb-pill hover:bg-canvas-surface cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onCategoryToggle(catId)}
                        className="rounded border-bdr accent-accent-amber shrink-0 size-3.5"
                      />
                      <span className="text-sm text-ink-pri font-body">{cat.name}</span>
                      {isPending && (
                        <span className="text-[10px] font-body px-1.5 py-0.5 rounded-tb-pill bg-accent-amber/15 text-accent-amber shrink-0">
                          chờ duyệt
                        </span>
                      )}
                    </label>
                  );
                })
              )}

              {/* Add new category row */}
              <div className="flex items-center gap-2 px-1.5 pt-2 mt-1 border-t border-bdr">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={e => { setNewCatInput(e.target.value); setCatError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleCreateCategory(); } }}
                  placeholder="Thêm danh mục mới..."
                  disabled={catCreating}
                  className="flex-1 bg-transparent text-sm font-body text-ink-pri placeholder:text-ink-muted outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={catCreating || !newCatInput.trim()}
                  onClick={() => void handleCreateCategory()}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-tb-pill bg-accent-amber/15 text-accent-amber text-xs font-body font-semibold hover:bg-accent-amber/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {catCreating ? (
                    <Loader2 size={11} className="shrink-0 animate-spin" />
                  ) : (
                    <Plus size={11} className="shrink-0" />
                  )}
                  Thêm
                </button>
              </div>
              {catError && (
                <p className="text-xs text-accent-red font-body px-1.5 pb-1">{catError}</p>
              )}
            </div>
            {errors.categoryIds && (
              <p className="text-xs text-accent-red font-body">{errors.categoryIds}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Brand combobox */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-ink-pri font-body text-sm">Thương hiệu</Label>

              {/* Selected brand chip — shown whenever a brand is selected */}
              {selectedBrand && (
                <div className="flex items-center gap-2 px-3 py-2 bg-canvas-elevated border border-bdr rounded-tb-input">
                  <span className="flex-1 text-sm font-body text-ink-pri truncate">{selectedBrand.name}</span>
                  {pendingBrandIds.has(selectedBrand.id) && (
                    <span className="text-[10px] font-body px-1.5 py-0.5 rounded-tb-pill bg-accent-amber/15 text-accent-amber shrink-0">
                      chờ duyệt
                    </span>
                  )}
                  <IconButton
                    onClick={handleClearBrand}
                    className="size-5 rounded-full text-ink-muted hover:text-ink-pri transition-colors shrink-0"
                  >
                    <X size={12} className="shrink-0" />
                  </IconButton>
                </div>
              )}

              {/* Filter input + dropdown — shown only when no brand selected */}
              {!selectedBrand && (
                <div ref={brandRef} className="relative">
                  <input
                    type="text"
                    value={brandQuery}
                    disabled={brandsLoading}
                    onChange={e => { setBrandQuery(e.target.value); setBrandOpen(true); setBrandError(null); }}
                    onFocus={() => setBrandOpen(true)}
                    placeholder={brandsLoading ? 'Đang tải...' : 'Tìm hoặc thêm thương hiệu...'}
                    className={inputCls()}
                  />

                  {brandOpen && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-canvas-surface border border-bdr rounded-tb-input shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredBrands.length === 0 && !showAddBrand && (
                        <p className="px-3 py-2.5 text-sm text-ink-muted font-body">Không tìm thấy thương hiệu.</p>
                      )}
                      {filteredBrands.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onMouseDown={e => { e.preventDefault(); handleSelectBrand(b); }}
                          className="w-full text-left px-3 py-2.5 text-sm font-body text-ink-pri hover:bg-canvas-elevated transition-colors flex items-center gap-2"
                        >
                          <span className="flex-1 truncate">{b.name}</span>
                          {pendingBrandIds.has(b.id) && (
                            <span className="text-[10px] font-body px-1.5 py-0.5 rounded-tb-pill bg-accent-amber/15 text-accent-amber shrink-0">
                              chờ duyệt
                            </span>
                          )}
                        </button>
                      ))}
                      {showAddBrand && (
                        <button
                          type="button"
                          disabled={brandCreating}
                          onMouseDown={e => { e.preventDefault(); void handleCreateBrand(); }}
                          className="w-full text-left px-3 py-2.5 text-sm font-body text-accent-amber hover:bg-canvas-elevated transition-colors flex items-center gap-2 border-t border-bdr disabled:opacity-50"
                        >
                          {brandCreating ? (
                            <Loader2 size={13} className="shrink-0 animate-spin" />
                          ) : (
                            <Plus size={13} className="shrink-0" />
                          )}
                          <span>Thêm &ldquo;{brandQuery.trim()}&rdquo; làm thương hiệu mới</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {brandError && <p className="text-xs text-accent-red font-body">{brandError}</p>}
            </div>

            {/* Condition segmented control */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-ink-pri font-body text-sm">Tình trạng</Label>
              <div className="flex gap-1 p-1 bg-canvas-elevated border border-bdr rounded-tb-input">
                {CONDITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onConditionChange(opt.value)}
                    className={cn(
                      'flex-1 py-1.5 rounded-tb-pill text-xs font-body font-medium transition-all',
                      condition === opt.value
                        ? 'bg-accent-amber text-canvas-base shadow-sm'
                        : 'text-ink-sec hover:text-ink-pri',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SKU */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-ink-pri font-body text-sm">Mã SKU</Label>
            <div className="flex gap-2">
              <Input
                value={sku}
                onChange={e => onSkuChange(e.target.value.toUpperCase())}
                placeholder="VD: IPHONE14PM-256-BLK"
                className={cn(inputCls(!!errors.sku), 'flex-1 font-mono text-sm tracking-wide')}
              />
              <IconButton
                onClick={generateSku}
                title="Tự động tạo SKU"
                className={cn(
                  'size-[42px] rounded-tb-input shrink-0',
                  'bg-canvas-elevated border border-bdr text-ink-sec',
                  'hover:border-accent-amber/50 hover:text-accent-amber transition-colors',
                )}
              >
                <RefreshCw size={15} className="shrink-0" />
              </IconButton>
            </div>
            {errors.sku
              ? <p className="text-xs text-accent-red font-body">{errors.sku}</p>
              : <p className="text-xs text-ink-muted font-body">Bỏ trống để hệ thống tự tạo mã.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
