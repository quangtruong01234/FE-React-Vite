import { useState, useEffect, useMemo, useRef, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { IconButton } from '@/components/shared/IconButton';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { useAuthContext } from '@/context/AuthContext';
import { useRole } from '@/hooks/auth/useRole';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/format/utils';
import type { ApiError, CreateProductDto } from '@/types';
import { useProductForm } from './product-form/useProductForm';
import { makeVarGroup, type ImageItem, type SkuRowState, type VarGroup } from './product-form/useProductForm';
import { BasicInfoSection } from './product-form/BasicInfoSection';
import { VariationBuilder } from './product-form/VariationBuilder';
import { SkuMatrix } from './product-form/SkuMatrix';
import { ShippingMiscSection } from './product-form/ShippingMiscSection';

const inputCls = cn(
  'w-full bg-canvas-elevated border border-bdr rounded-tb-input',
  'px-3.5 py-2.5 text-ink-pri font-body text-sm placeholder:text-ink-muted',
  'outline-none transition-colors',
  'focus:border-accent-amber/50 focus:ring-2 focus:ring-accent-amber/20',
);

/**
 * Persist stock for a freshly-created simple product.
 *
 * The backend does not create an inventory row on product create, so we seed
 * one. But a stale/orphan inventory row can already exist for a reused product
 * ID (returns 409). In that case we must update the existing row with the new
 * product's SKU + stock instead of ignoring the conflict — otherwise the new
 * product inherits the old row's stale stock (often 0 / "hết hàng").
 *
 * Throws if stock cannot be persisted, so the caller does not report a false
 * "created successfully".
 */
async function persistSimpleStock(
  productId: number,
  sku: string,
  availableStock: number,
): Promise<void> {
  try {
    await api.inventory.create({ productId, sku, availableStock });
  } catch (err: unknown) {
    if ((err as ApiError).status !== 409) throw err;
    // Row already exists for this product ID — reconcile it to the new product.
    const existing = await api.inventory.getByProduct(productId);
    await api.inventory.update(existing.id, { sku, availableStock });
  }
}

function SectionHeader({
  num,
  title,
  right,
}: {
  num: string;
  title: string;
  right?: ReactElement;
}): ReactElement {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-bdr">
      <span className="size-7 rounded-full bg-accent-amber/10 grid place-items-center shrink-0">
        <span className="font-display font-bold text-xs text-accent-amber">{num}</span>
      </span>
      <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-ink-pri">
        {title}
      </h2>
      {right !== undefined && <div className="ml-auto">{right}</div>}
    </div>
  );
}


export default function CreateProductPage(): ReactElement {
  const { id } = useParams<{ id?: string }>();
  const productId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const roleState = useRole();
  const queryClient = useQueryClient();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitSuccessRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const isEditMode = !!productId;

  const { data: existingProduct, isLoading: productLoading } = useQuery({
    queryKey: queryKeys.products.withInventory(productId ?? 0),
    queryFn: () => api.products.getWithInventory(productId ?? 0),
    enabled: isEditMode,
    staleTime: 0,
  });

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: () => api.products.getBrands(),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => api.products.getCategories(),
  });

  const hasVariations = isEditMode && existingProduct
    ? (existingProduct.variations?.length ?? 0) > 0
    : false;

  // Full hydration of the edit form from the persisted product (P0-05): basic
  // fields, variation groups, the SKU price/stock matrix, and existing images —
  // so saving preserves data instead of resetting variations/stock to 0.
  const initialFields = useMemo(() => {
    if (!isEditMode || !existingProduct) return undefined;
    const groups: VarGroup[] = (existingProduct.variations ?? []).map(v =>
      makeVarGroup({ name: v.name, options: [...v.options] }),
    );
    const rows: Record<string, SkuRowState> = {};
    (existingProduct.skus ?? []).forEach(s => {
      rows[JSON.stringify(s.tierIdx)] = {
        price: String(s.price ?? ''),
        stockQuantity: String(s.stockQuantity ?? s.stock ?? ''),
      };
    });
    return {
      name: existingProduct.name,
      description: existingProduct.description ?? '',
      sku: existingProduct.sku,
      // The API returns ids as strings despite the typed contract — coerce to
      // number so brand selection and category checkboxes hydrate as checked.
      brandId: existingProduct.brandId != null ? Number(existingProduct.brandId) : null,
      condition: existingProduct.condition,
      isActive: existingProduct.isActive ?? true,
      categoryIds: (existingProduct.categoryIds ?? []).map(Number),
      sellerNotes: existingProduct.sellerNotes ?? '',
      hasVariations,
      ...(hasVariations && groups.length > 0 ? { groups } : {}),
      rows,
      singlePrice: hasVariations ? '' : String(existingProduct.price ?? ''),
      singleStock: hasVariations ? '' : String(existingProduct.inventory?.totalStock ?? ''),
    };
  }, [isEditMode, existingProduct, hasVariations]);

  const initialImages = useMemo<ImageItem[] | undefined>(() => {
    if (!isEditMode || !existingProduct) return undefined;
    const urls = existingProduct.imageUrls?.length
      ? existingProduct.imageUrls
      : existingProduct.imageUrl
        ? [existingProduct.imageUrl]
        : [];
    // publicId === '' marks these as already-persisted (never Cloudinary-deleted).
    return urls.map(url => ({ url, publicId: '' }));
  }, [isEditMode, existingProduct]);

  const form = useProductForm(initialFields, initialImages);

  // SKU combinations that exist on the saved product — used to warn before a
  // destructive edit removes any of them (they may be referenced by orders/carts).
  const originalTierIdx = useMemo(
    () => new Set((existingProduct?.skus ?? []).map(s => JSON.stringify(s.tierIdx))),
    [existingProduct],
  );

  const clearImagesRef = useRef(form.clearImages);
  clearImagesRef.current = form.clearImages;

  // Delete orphaned Cloudinary images if user leaves without submitting
  useEffect(() => {
    submitSuccessRef.current = submitSuccess;
  }, [submitSuccess]);

  useEffect(() => {
    return () => {
      if (!submitSuccessRef.current) clearImagesRef.current();
    };
  }, []);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (dto: CreateProductDto) => {
      if (isEditMode && productId) {
        return api.products.update(productId, dto);
      }
      const created = await api.products.create(dto);
      // Simple products get no inventory row from the backend, so they'd hit
      // "Insufficient stock" on purchase. Seed one from the form's stock value.
      const isVariation = (dto.variations?.length ?? 0) > 0;
      if (!isVariation && (dto.stockQuantity ?? 0) > 0) {
        await persistSimpleStock(Number(created.id), dto.sku, dto.stockQuantity ?? 0);
      }
      return created;
    },
    onSuccess: p => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.byProduct(Number(p.id)),
      });
      // Edit mode: make the detail/with-inventory views reflect the changes.
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(Number(p.id)) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventory(Number(p.id)),
      });
      setSubmitSuccess(true);
      timerRef.current = setTimeout(() => navigate(`/product/${p.id}`), 1200);
    },
    onError: (e: unknown) => {
      const err = e as ApiError;
      // Product create rejects with 409 only for a duplicate SKU.
      if (!isEditMode && err.status === 409) {
        form.setFieldError('sku', 'SKU đã tồn tại');
        return;
      }
      // Any other failure (notably stock persistence) means the listing is not
      // reliably saved — surface it instead of reporting a false success.
      setSubmitError(
        'Không thể lưu tồn kho cho sản phẩm. Vui lòng thử lại hoặc cập nhật số lượng kho sau.',
      );
    },
  });

  async function handleSubmit(draftMode: boolean): Promise<void> {
    setSubmitError(null);
    const errs = form.validate(draftMode);
    if (Object.keys(errs).length > 0) return;

    // Warn before an edit removes SKU combinations that already exist on the
    // saved product — those rows may be referenced by orders or carts.
    if (isEditMode && originalTierIdx.size > 0) {
      const nextTierIdx = new Set(
        form.fields.hasVariations ? form.combos.map(c => c.tierIdx) : [],
      );
      const removed = [...originalTierIdx].filter(t => !nextTierIdx.has(t));
      if (removed.length > 0) {
        const ok = window.confirm(
          `Bạn sắp xóa ${removed.length} phân loại (SKU) đã tồn tại trên sản phẩm. ` +
            `Đơn hàng hoặc giỏ hàng đang tham chiếu các SKU này có thể bị ảnh hưởng. Tiếp tục?`,
        );
        if (!ok) return;
      }
    }

    const payload = form.buildPayload();
    if (draftMode) payload.isActive = false;
    await mutateAsync(payload);
  }

  const isReady =
    form.fields.name.trim() !== '' &&
    form.fields.sku.trim() !== '' &&
    form.fields.categoryIds.length > 0 &&
    (form.fields.hasVariations ||
      (!!form.fields.singlePrice && Number(form.fields.singlePrice) > 0));

  const missingItems = [
    !form.fields.name.trim() && 'tên',
    form.fields.categoryIds.length === 0 && 'danh mục',
    !form.fields.sku.trim() && 'SKU',
    !form.fields.hasVariations &&
      (!form.fields.singlePrice || Number(form.fields.singlePrice) <= 0) &&
      'giá',
  ].filter((x): x is string => typeof x === 'string');

  if (isEditMode && (productLoading || !existingProduct)) {
    return (
      <div className="flex flex-col gap-4 py-6">
        <Skeleton className="h-8 w-48 rounded-tb-card" />
        <Skeleton className="h-64 w-full rounded-tb-card" />
        <Skeleton className="h-48 w-full rounded-tb-card" />
      </div>
    );
  }

  const isSeller = roleState?.isSeller ?? false;
  const isAdmin = roleState?.isAdmin ?? false;
  if (!isSeller && !isAdmin) {
    void navigate('/');
    return <></>;
  }

  return (
    <div className="relative pb-28">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <IconButton
          onClick={() => navigate(-1)}
          className="size-8 rounded-full hover:bg-canvas-elevated text-ink-sec transition-colors shrink-0"
        >
          <ChevronLeft size={18} className="shrink-0" />
        </IconButton>
        <h1 className="font-display font-bold text-xl uppercase tracking-wide text-ink-pri">
          {isEditMode ? 'Sửa sản phẩm' : 'Đăng sản phẩm mới'}
        </h1>
      </div>

      {/* 2-col layout on xl */}
      <div className="flex flex-col gap-5">
          <BasicInfoSection
            images={form.images}
            uploadState={form.uploadState}
            onAddImages={form.addImages}
            onRemoveImage={form.removeImage}
            userId={currentUser?.id ?? 0}
            name={form.fields.name}
            description={form.fields.description}
            sku={form.fields.sku}
            brandId={form.fields.brandId}
            categoryIds={form.fields.categoryIds}
            condition={form.fields.condition}
            brands={brands}
            categories={categories}
            brandsLoading={brandsLoading}
            categoriesLoading={categoriesLoading}
            errors={form.errors}
            onNameChange={v => form.setField('name', v)}
            onDescriptionChange={v => form.setField('description', v)}
            onSkuChange={v => form.setField('sku', v)}
            onBrandChange={v => form.setField('brandId', v)}
            onCategoryToggle={catId => {
              const current = form.fields.categoryIds;
              form.setField(
                'categoryIds',
                current.includes(catId)
                  ? current.filter(x => x !== catId)
                  : [...current, catId],
              );
            }}
            onConditionChange={v => form.setField('condition', v)}
          />

          {/* Section 03: Sales */}
          <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
            <SectionHeader
              num="03"
              title="Thông tin bán hàng"
              right={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted font-body">Nhiều phân loại</span>
                  <ToggleSwitch
                    size="sm"
                    checked={form.fields.hasVariations}
                    onChange={v => form.setField('hasVariations', v)}
                  />
                </div>
              }
            />

            <div className="p-6 flex flex-col gap-5">
              {!form.fields.hasVariations ? (
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-ink-pri font-body text-sm">Giá (VND) *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="VD: 1299000"
                      value={form.fields.singlePrice}
                      onChange={e => form.setField('singlePrice', e.target.value)}
                      className={cn(
                        inputCls,
                        form.errors.singlePrice &&
                          'border-accent-red focus:border-accent-red',
                      )}
                    />
                    {form.errors.singlePrice && (
                      <p className="text-xs text-accent-red font-body">
                        {form.errors.singlePrice}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-ink-pri font-body text-sm">Số lượng kho</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="VD: 100"
                      value={form.fields.singleStock}
                      onChange={e => form.setField('singleStock', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {isEditMode && (
                    <p className="text-sm text-accent-amber font-body px-4 py-3 bg-accent-amber/5 border border-accent-amber/20 rounded-tb-card">
                      Sửa phân loại sẽ cập nhật lại SKU. Giá/kho hiện tại đã được nạp sẵn —
                      chỉ thay đổi phần cần sửa. Xóa phân loại đã tồn tại sẽ cần xác nhận.
                    </p>
                  )}
                  <VariationBuilder
                    groups={form.fields.groups}
                    errors={form.errors}
                    onSetGroupName={form.setGroupName}
                    onAddOption={form.addOptionToGroup}
                    onRemoveOption={form.removeOptionFromGroup}
                    onAddGroup={form.addGroup}
                    onRemoveGroup={form.removeGroup}
                  />
                  {form.combos.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-ink-sec font-body">
                        {form.combos.length} tổ hợp được tạo tự động
                      </p>
                      <SkuMatrix
                        combos={form.combos}
                        validGroups={form.validGroups}
                        rows={form.fields.rows}
                        errors={form.errors}
                        onSetRow={form.setSkuRow}
                        onApplyAll={form.applyAllRows}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <ShippingMiscSection
            weight={form.fields.weight}
            sellerNotes={form.fields.sellerNotes}
            errors={form.errors}
            onWeightChange={v => form.setField('weight', v)}
            onSellerNotesChange={v => form.setField('sellerNotes', v)}
          />
      </div>

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-canvas-surface/90 backdrop-blur-md border-t border-bdr">
        <div className="max-w-screen-xl mx-auto px-5 py-3 flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5">
            {submitError ? (
              <>
                <AlertCircle size={14} className="shrink-0 text-accent-red" />
                <span className="text-xs font-body text-accent-red">{submitError}</span>
              </>
            ) : isReady ? (
              <>
                <CheckCircle2 size={14} className="shrink-0 text-accent-green" />
                <span className="text-xs font-body text-accent-green">Sẵn sàng để đăng</span>
              </>
            ) : missingItems.length > 0 ? (
              <>
                <AlertCircle size={14} className="shrink-0 text-accent-red" />
                <span className="text-xs font-body text-accent-red">
                  Còn thiếu: {missingItems.join(', ')}
                </span>
              </>
            ) : null}
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-tb-cta text-sm font-body font-medium text-ink-sec bg-canvas-elevated border border-bdr hover:text-ink-pri hover:border-accent-amber/30 transition-colors"
            >
              Hủy
            </button>
            {!isEditMode && (
              <button
                type="button"
                onClick={() => void handleSubmit(true)}
                disabled={isPending || submitSuccess || !form.fields.name.trim()}
                className="px-4 py-2 rounded-tb-cta text-sm font-body font-medium text-ink-sec bg-canvas-elevated border border-bdr hover:text-ink-pri hover:border-accent-amber/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Đang xử lý...' : 'Lưu nháp'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSubmit(false)}
              disabled={isPending || submitSuccess || !isReady}
              className={cn(
                'px-5 py-2 rounded-tb-cta text-sm font-body font-semibold text-canvas-base',
                'bg-tb-gradient shadow-tb-cta transition-opacity',
                'hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
                submitSuccess && 'opacity-100 disabled:opacity-100',
              )}
            >
              {submitSuccess
                ? isEditMode
                  ? '✓ Đã lưu!'
                  : '✓ Đã đăng!'
                : isPending
                  ? 'Đang xử lý...'
                  : isEditMode
                    ? 'Lưu thay đổi'
                    : 'Đăng bán'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
