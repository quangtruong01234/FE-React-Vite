import { useState, useMemo, useRef, useEffect } from 'react';
import type { CreateProductDto, ProductCondition } from '@/types';
import { uploadProductImage, deleteMedia } from '@/lib/http/cloudinary';

export interface VarGroup {
  name: string;
  options: string[];
}

export interface ComboItem {
  tierIdx: string;
  idx: number[];
  labels: string[];
}

export interface ImageItem {
  url: string;
  publicId: string;
}

export interface SkuRowState {
  price: string;
  stockQuantity: string;
}

export interface FormFields {
  name: string;
  description: string;
  sku: string;
  brandId: number | null;
  categoryIds: number[];
  condition: ProductCondition;
  sellerNotes: string;
  weight: string;
  isActive: boolean;
  hasVariations: boolean;
  singlePrice: string;
  singleStock: string;
  groups: VarGroup[];
  rows: Record<string, SkuRowState>;
}

export type FormErrors = Partial<Record<string, string>>;

function buildCombosInternal(groups: VarGroup[]): { valid: VarGroup[]; combos: ComboItem[] } {
  const valid = groups.filter(g => g.name.trim() && g.options.length > 0);
  if (!valid.length) return { valid, combos: [] };
  let combos: number[][] = [[]];
  for (const g of valid) {
    const next: number[][] = [];
    for (const c of combos) g.options.forEach((_, oi) => next.push([...c, oi]));
    combos = next;
  }
  return {
    valid,
    combos: combos.map(idx => ({
      tierIdx: JSON.stringify(idx),
      idx,
      labels: idx.map((oi, gi) => valid[gi].options[oi]),
    })),
  };
}

const DEFAULT_FIELDS: FormFields = {
  name: '',
  description: '',
  sku: '',
  brandId: null,
  categoryIds: [],
  condition: 'new',
  sellerNotes: '',
  weight: '',
  isActive: true,
  hasVariations: false,
  singlePrice: '',
  singleStock: '',
  groups: [{ name: '', options: [] }],
  rows: {},
};

export type SimpleField = keyof Omit<FormFields, 'groups' | 'rows'>;

export interface UseProductFormReturn {
  fields: FormFields;
  errors: FormErrors;
  images: ImageItem[];
  uploadState: { active: boolean; percent: number; error: string | null };
  combos: ComboItem[];
  validGroups: VarGroup[];
  setField: <K extends SimpleField>(key: K, value: FormFields[K]) => void;
  setSkuRow: (tierIdx: string, field: 'price' | 'stockQuantity', value: string) => void;
  applyAllRows: (field: 'price' | 'stockQuantity', value: string) => void;
  setGroupName: (index: number, name: string) => void;
  addOptionToGroup: (index: number, option: string) => void;
  removeOptionFromGroup: (index: number, optionIndex: number) => void;
  addGroup: () => void;
  removeGroup: (index: number) => void;
  addImages: (files: File[], userId: number) => Promise<void>;
  removeImage: (index: number) => void;
  clearImages: () => void;
  validate: (draftMode?: boolean) => FormErrors;
  buildPayload: () => CreateProductDto;
  setFieldError: (key: string, message: string) => void;
  clearErrors: () => void;
}

export function useProductForm(
  initial?: Partial<FormFields>,
  initialImages?: ImageItem[],
): UseProductFormReturn {
  const [fields, setFields] = useState<FormFields>({ ...DEFAULT_FIELDS, ...initial });
  const [errors, setErrors] = useState<FormErrors>({});
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initial && !initializedRef.current) {
      initializedRef.current = true;
      setFields({ ...DEFAULT_FIELDS, ...initial });
    }
  }, [initial]);
  const [images, setImages] = useState<ImageItem[]>(initialImages ?? []);
  const imagesRef = useRef<ImageItem[]>(initialImages ?? []);
  // Edit mode: hydrate pre-existing product images once they arrive. These carry
  // an empty `publicId` to mark them as already-persisted (see removeImage).
  const seededImagesRef = useRef(false);
  useEffect(() => {
    if (initialImages && initialImages.length > 0 && !seededImagesRef.current) {
      seededImagesRef.current = true;
      imagesRef.current = initialImages;
      setImages(initialImages);
    }
  }, [initialImages]);
  const [uploadState, setUploadState] = useState({ active: false, percent: 0, error: null as string | null });

  const { valid: validGroups, combos } = useMemo(
    () => buildCombosInternal(fields.groups),
    [fields.groups],
  );

  function setField<K extends SimpleField>(key: K, value: FormFields[K]): void {
    setFields(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key as string]: undefined }));
  }

  function setSkuRow(tierIdx: string, field: 'price' | 'stockQuantity', value: string): void {
    setFields(prev => ({
      ...prev,
      rows: {
        ...prev.rows,
        [tierIdx]: {
          price: prev.rows[tierIdx]?.price ?? '',
          stockQuantity: prev.rows[tierIdx]?.stockQuantity ?? '',
          [field]: value,
        },
      },
    }));
  }

  function applyAllRows(field: 'price' | 'stockQuantity', value: string): void {
    setFields(prev => {
      const { combos: currentCombos } = buildCombosInternal(prev.groups);
      const updatedRows = { ...prev.rows };
      currentCombos.forEach(c => {
        updatedRows[c.tierIdx] = {
          price: updatedRows[c.tierIdx]?.price ?? '',
          stockQuantity: updatedRows[c.tierIdx]?.stockQuantity ?? '',
          [field]: value,
        };
      });
      return { ...prev, rows: updatedRows };
    });
  }

  function setGroupName(index: number, name: string): void {
    setFields(prev => ({
      ...prev,
      groups: prev.groups.map((g, i) => i === index ? { ...g, name } : g),
    }));
  }

  function addOptionToGroup(index: number, option: string): void {
    const trimmed = option.trim();
    if (!trimmed) return;
    setFields(prev => ({
      ...prev,
      groups: prev.groups.map((g, i) => {
        if (i !== index || g.options.includes(trimmed)) return g;
        return { ...g, options: [...g.options, trimmed] };
      }),
    }));
  }

  function removeOptionFromGroup(index: number, optionIndex: number): void {
    setFields(prev => ({
      ...prev,
      groups: prev.groups.map((g, i) => {
        if (i !== index) return g;
        return { ...g, options: g.options.filter((_, oi) => oi !== optionIndex) };
      }),
    }));
  }

  function addGroup(): void {
    if (fields.groups.length >= 2) return;
    setFields(prev => ({
      ...prev,
      groups: [...prev.groups, { name: '', options: [] }],
    }));
  }

  function removeGroup(index: number): void {
    setFields(prev => ({
      ...prev,
      groups: prev.groups.filter((_, i) => i !== index),
    }));
  }

  async function addImages(files: File[], userId: number): Promise<void> {
    if (!files.length) return;
    setUploadState({ active: true, percent: 0, error: null });
    try {
      const uploaded: ImageItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const result = await uploadProductImage(files[i], userId, p => {
          const base = (i / files.length) * 100;
          setUploadState(prev => ({ ...prev, percent: Math.round(base + p / files.length) }));
        });
        uploaded.push({ url: result.url, publicId: result.publicId });
      }
      setImages(prev => {
        const next = [...prev, ...uploaded];
        imagesRef.current = next;
        return next;
      });
    } catch (err: unknown) {
      setUploadState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Upload ảnh thất bại',
      }));
    } finally {
      setUploadState(prev => ({ ...prev, active: false, percent: 0 }));
    }
  }

  function removeImage(index: number): void {
    const item = imagesRef.current[index];
    // Only Cloudinary-delete images uploaded in this session (they own a
    // publicId). Pre-existing product images (publicId === '') must NOT be
    // destroyed — the user may cancel, and the saved product still references
    // them. Dropping them from the list is enough; the update payload omits them.
    if (item?.publicId) void deleteMedia(item.publicId);
    setImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      imagesRef.current = next;
      return next;
    });
  }

  function clearImages(): void {
    imagesRef.current.forEach(img => {
      if (img.publicId) void deleteMedia(img.publicId);
    });
    imagesRef.current = [];
    setImages([]);
  }

  function validate(draftMode = false): FormErrors {
    const errs: FormErrors = {};

    if (!fields.name.trim()) errs.name = 'Tên sản phẩm không được để trống';
    if (fields.categoryIds.length === 0) errs.categoryIds = 'Chọn ít nhất một danh mục';
    if (!fields.sku.trim()) errs.sku = 'SKU không được để trống';

    if (!draftMode) {
      if (fields.hasVariations) {
        if (validGroups.length === 0) {
          errs.variations = 'Thêm ít nhất một nhóm phân loại có tên và options';
        } else {
          for (const g of validGroups) {
            if (new Set(g.options).size !== g.options.length) {
              errs.variations = `Nhóm "${g.name}" có options trùng nhau`;
            }
          }
          const hasMissingPrice = combos.some(c => {
            const row = fields.rows[c.tierIdx];
            return !row || Number(row.price) <= 0;
          });
          if (hasMissingPrice) errs.skuMatrix = 'Tất cả tổ hợp phải có giá > 0';
        }
      } else if (!fields.singlePrice || Number(fields.singlePrice) <= 0) {
        errs.singlePrice = 'Giá phải lớn hơn 0';
      }
    }

    setErrors(errs);
    return errs;
  }

  function buildPayload(): CreateProductDto {
    const common = {
      name: fields.name.trim(),
      description: fields.description.trim() || undefined,
      sku: fields.sku.trim() || 'DRAFT',
      brandId: fields.brandId,
      categoryIds: fields.categoryIds.length > 0 ? fields.categoryIds : [1],
      isActive: fields.isActive,
      condition: fields.condition,
      sellerNotes: fields.sellerNotes.trim() || undefined,
      weight: fields.weight === '' ? undefined : Number(fields.weight),
      imageUrls: images.length > 0 ? images.map(img => img.url) : undefined,
    };

    if (fields.hasVariations && combos.length > 0) {
      const skuList = combos.map(c => ({
        tierIdx: c.tierIdx,
        price: Number(fields.rows[c.tierIdx]?.price ?? 0),
        stockQuantity: Number(fields.rows[c.tierIdx]?.stockQuantity ?? 0),
      }));
      const prices = skuList.map(s => s.price).filter(p => p > 0);
      return {
        ...common,
        price: prices.length ? Math.min(...prices) : 0,
        stockQuantity: skuList.reduce((s, x) => s + x.stockQuantity, 0),
        variations: validGroups.map(g => ({ name: g.name.trim(), options: g.options })),
        skuList,
      };
    }

    return {
      ...common,
      price: Number(fields.singlePrice) || 0,
      stockQuantity: Number(fields.singleStock) || 0,
    };
  }

  function setFieldError(key: string, message: string): void {
    setErrors(prev => ({ ...prev, [key]: message }));
  }

  function clearErrors(): void {
    setErrors({});
  }

  return {
    fields,
    errors,
    images,
    uploadState,
    combos,
    validGroups,
    setField,
    setSkuRow,
    applyAllRows,
    setGroupName,
    addOptionToGroup,
    removeOptionFromGroup,
    addGroup,
    removeGroup,
    addImages,
    removeImage,
    clearImages,
    validate,
    buildPayload,
    setFieldError,
    clearErrors,
  };
}
