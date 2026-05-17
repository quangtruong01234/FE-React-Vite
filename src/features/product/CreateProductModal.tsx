import { useState, useEffect, type ReactElement, type ChangeEvent, type FormEvent } from 'react';
import { api } from '@/api';
import { useAuthContext } from '@/context/AuthContext';
import type { Brand, Category } from '@/types';
import './CreateProduct.css';

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

export default function CreateProductModal({ onProductCreated, onCancel }: CreateProductModalProps): ReactElement {
  const { currentUser } = useAuthContext();
  const [formData, setFormData] = useState<FormData>({
    name: '', description: '', price: '', stockQuantity: '', sku: '',
    brandId: '', categoryId: '', imageUrl: '', sellerNotes: '', condition: 'new',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function fetchData(): Promise<void> {
      try {
        setDataLoading(true);
        const [brandsResult, categoriesResult] = await Promise.allSettled([
          api.products.getBrands(),
          api.products.getCategories(),
        ]);
        setBrands(brandsResult.status === 'fulfilled' ? brandsResult.value : []);
        setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value : []);
      } finally {
        setDataLoading(false);
      }
    }
    void fetchData();
  }, []);

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
    setLoading(true);
    try {
      const productData = {
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
      };
      await api.products.create(productData);
      onProductCreated();
    } catch (err: unknown) {
      const msg = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Lỗi tạo sản phẩm';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-product-overlay">
      <div className="create-product-modal">
        <div className="create-product-header">
          <h2>📝 Tạo sản phẩm mới</h2>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="create-product-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="name">Tên sản phẩm *</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="VD: iPhone 14 Pro Max" className={errors.name ? 'error' : ''} />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            <div className="form-group full-width">
              <label htmlFor="description">Mô tả sản phẩm *</label>
              <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Mô tả chi tiết về sản phẩm..." rows={3} className={errors.description ? 'error' : ''} />
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="price">Giá (VND) *</label>
              <input type="number" id="price" name="price" value={formData.price} onChange={handleChange} placeholder="30000000" min="0" className={errors.price ? 'error' : ''} />
              {errors.price && <span className="error-text">{errors.price}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="stockQuantity">Số lượng tồn kho *</label>
              <input type="number" id="stockQuantity" name="stockQuantity" value={formData.stockQuantity} onChange={handleChange} placeholder="100" min="0" className={errors.stockQuantity ? 'error' : ''} />
              {errors.stockQuantity && <span className="error-text">{errors.stockQuantity}</span>}
            </div>
            <div className="form-group full-width">
              <label htmlFor="sku">SKU (Mã sản phẩm) *</label>
              <div className="sku-input-group">
                <input type="text" id="sku" name="sku" value={formData.sku} onChange={handleChange} placeholder="IPHONE14PROMAX" className={errors.sku ? 'error' : ''} />
                <button type="button" onClick={generateSKU} className="generate-sku-btn">🔄 Tự động tạo</button>
              </div>
              {errors.sku && <span className="error-text">{errors.sku}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="brandId">Thương hiệu</label>
              <select id="brandId" name="brandId" value={formData.brandId} onChange={handleChange} disabled={dataLoading}>
                <option value="">{dataLoading ? '🔄 Đang tải...' : '-- Chọn thương hiệu --'}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{getBrandIcon(brand.name)} {brand.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="categoryId">Danh mục *</label>
              <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange} className={errors.categoryId ? 'error' : ''} disabled={dataLoading}>
                <option value="">{dataLoading ? '🔄 Đang tải...' : '-- Chọn danh mục --'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className="error-text">{errors.categoryId}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="condition">Tình trạng sản phẩm</label>
              <select id="condition" name="condition" value={formData.condition} onChange={handleChange}>
                <option value="new">🆕 Mới</option>
                <option value="used">📦 Đã sử dụng</option>
                <option value="refurbished">🔧 Tân trang</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="imageUrl">URL hình ảnh</label>
              <input type="url" id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://..." />
            </div>
            <div className="form-group full-width">
              <label htmlFor="sellerNotes">Ghi chú của người bán</label>
              <textarea id="sellerNotes" name="sellerNotes" value={formData.sellerNotes} onChange={handleChange} placeholder="Thông tin bảo hành, khuyến mãi..." rows={2} />
            </div>
          </div>
          {errors.submit && <div className="error-alert">❌ {errors.submit}</div>}
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">Hủy bỏ</button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? <><div className="spinner"></div>Đang tạo...</> : '🚀 Tạo sản phẩm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
