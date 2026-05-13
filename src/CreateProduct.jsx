import { useState, useEffect } from 'react';
import './CreateProduct.css';

const CreateProduct = ({ onProductCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stockQuantity: '',
    sku: '',
    brandId: '',
    categoryId: '',
    imageUrl: '',
    sellerNotes: '',
    condition: 'new'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch brands and categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch brands
        const brandsResponse = await fetch('http://localhost:3000/api/products/brands', { credentials: 'include' });
        if (brandsResponse.ok) {
          const brandsData = await brandsResponse.json();
          setBrands(Array.isArray(brandsData) ? brandsData : brandsData.data || []);
        } else {
          console.warn('Failed to fetch brands');
          setBrands([]);
        }

        // Fetch categories
        const categoriesResponse = await fetch('http://localhost:3000/api/products/categories', { credentials: 'include' });
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData.data || []);
        } else {
          console.warn('Failed to fetch categories');
          setCategories([]);
        }
        
      } catch (error) {
        console.error('Error fetching brands/categories:', error);
        setBrands([]);
        setCategories([]);
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const generateSKU = () => {
    if (formData.name) {
      const sku = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .substring(0, 15) + '_' + Date.now().toString().slice(-4);
      
      setFormData(prev => ({
        ...prev,
        sku
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Tên sản phẩm không được để trống';
    if (!formData.description.trim()) newErrors.description = 'Mô tả không được để trống';
    if (!formData.price || formData.price <= 0) newErrors.price = 'Giá phải lớn hơn 0';
    if (!formData.sku.trim()) newErrors.sku = 'SKU không được để trống';
    if (!formData.categoryId) newErrors.categoryId = 'Vui lòng chọn danh mục';
    if (!formData.stockQuantity || formData.stockQuantity < 0) newErrors.stockQuantity = 'Số lượng tồn kho không hợp lệ';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Prepare data for API
      const productData = {
        ...formData,
        price: parseInt(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        brandId: formData.brandId ? parseInt(formData.brandId) : null,
        categoryId: parseInt(formData.categoryId),
        userId: 1, // TODO: Get from authentication context
        // Social metrics default to 0
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewCount: 0,
        isFeatured: false,
        isTrending: false,
        rating: 0,
        ratingCount: 0
      };

      // Remove empty fields
      Object.keys(productData).forEach(key => {
        if (productData[key] === '' || productData[key] === null) {
          delete productData[key];
        }
      });

      console.log('📦 Creating product:', productData);

      const response = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi tạo sản phẩm');
      }

      const result = await response.json();
      console.log('✅ Product created:', result);

      // Callback to parent component
      if (onProductCreated) {
        onProductCreated(result.data);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        stockQuantity: '',
        sku: '',
        brandId: '',
        categoryId: '',
        imageUrl: '',
        sellerNotes: '',
        condition: 'new'
      });

    } catch (error) {
      console.error('❌ Error creating product:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-product-overlay">
      <div className="create-product-modal">
        <div className="create-product-header">
          <h2>📝 Tạo sản phẩm mới</h2>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="create-product-form">
          <div className="form-grid">
            {/* Tên sản phẩm */}
            <div className="form-group full-width">
              <label htmlFor="name">Tên sản phẩm *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="VD: iPhone 14 Pro Max"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            {/* Mô tả */}
            <div className="form-group full-width">
              <label htmlFor="description">Mô tả sản phẩm *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Mô tả chi tiết về sản phẩm..."
                rows="3"
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>

            {/* Giá và Số lượng */}
            <div className="form-group">
              <label htmlFor="price">Giá (VND) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="30000000"
                min="0"
                className={errors.price ? 'error' : ''}
              />
              {errors.price && <span className="error-text">{errors.price}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="stockQuantity">Số lượng tồn kho *</label>
              <input
                type="number"
                id="stockQuantity"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                placeholder="100"
                min="0"
                className={errors.stockQuantity ? 'error' : ''}
              />
              {errors.stockQuantity && <span className="error-text">{errors.stockQuantity}</span>}
            </div>

            {/* SKU */}
            <div className="form-group full-width">
              <label htmlFor="sku">SKU (Mã sản phẩm) *</label>
              <div className="sku-input-group">
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="IPHONE14PROMAX"
                  className={errors.sku ? 'error' : ''}
                />
                <button type="button" onClick={generateSKU} className="generate-sku-btn">
                  🔄 Tự động tạo
                </button>
              </div>
              {errors.sku && <span className="error-text">{errors.sku}</span>}
            </div>

            {/* Brand và Category */}
            <div className="form-group">
              <label htmlFor="brandId">Thương hiệu</label>
              <select
                id="brandId"
                name="brandId"
                value={formData.brandId}
                onChange={handleChange}
                disabled={dataLoading}
              >
                <option value="">
                  {dataLoading ? '🔄 Đang tải...' : '-- Chọn thương hiệu --'}
                </option>
                {brands.map(brand => {
                  // Add icons for popular brands
                  const getBrandIcon = (brandName) => {
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
                  
                  return (
                    <option key={brand.id} value={brand.id}>
                      {getBrandIcon(brand.name)} {brand.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="categoryId">Danh mục *</label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className={errors.categoryId ? 'error' : ''}
                disabled={dataLoading}
              >
                <option value="">
                  {dataLoading ? '🔄 Đang tải...' : '-- Chọn danh mục --'}
                </option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.categoryId && <span className="error-text">{errors.categoryId}</span>}
            </div>

            {/* Condition */}
            <div className="form-group">
              <label htmlFor="condition">Tình trạng sản phẩm</label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
              >
                <option value="new">🆕 Mới</option>
                <option value="used">📦 Đã sử dụng</option>
                <option value="refurbished">🔧 Tân trang</option>
              </select>
            </div>

            {/* Image URL */}
            <div className="form-group">
              <label htmlFor="imageUrl">URL hình ảnh</label>
              <input
                type="url"
                id="imageUrl"
                name="imageUrl"
                value="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=600"//{formData.imageUrl}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=600"
              />
            </div>

            {/* Seller Notes */}
            <div className="form-group full-width">
              <label htmlFor="sellerNotes">Ghi chú của người bán</label>
              <textarea
                id="sellerNotes"
                name="sellerNotes"
                value={formData.sellerNotes}
                onChange={handleChange}
                placeholder="Thông tin bảo hành, khuyến mãi, chú ý đặc biệt..."
                rows="2"
              />
            </div>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="error-alert">
              ❌ {errors.submit}
            </div>
          )}

          {/* Action buttons */}
          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Hủy bỏ
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Đang tạo...
                </>
              ) : (
                '🚀 Tạo sản phẩm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct;