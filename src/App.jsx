import { useState, useEffect, useRef } from 'react';
import './App.css';
import CreateProduct from './CreateProduct.jsx';
import Login from './Login.jsx';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Centralized fetch wrapper — attaches cookie credentials and throws a typed
// error on 401 so callers can redirect to login.
async function apiFetch(url, options = {}) {
  const response = await fetch(url, { ...options, credentials: 'include' });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return response;
}

/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} name
 * @property {string} [description]
 * @property {number} price
 * @property {number} stockQuantity
 * @property {string} sku
 * @property {number} [brandId]
 * @property {number} categoryId
 * @property {string} [imageUrl]
 * @property {boolean} isActive
 * @property {number} likesCount
 * @property {number} commentsCount
 * @property {number} sharesCount
 * @property {number} viewCount
 * @property {boolean} isFeatured
 * @property {boolean} isTrending
 * @property {string} [condition]
 * @property {string} [sellerNotes]
 * @property {number} rating
 * @property {number} ratingCount
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {Object} [brand]
 * @property {number} brand.id
 * @property {string} brand.name
 * @property {string} [brand.description]
 * @property {Object} category
 * @property {number} category.id
 * @property {string} category.name
 * @property {string} [category.description]
 */

/**
 * @typedef {Product & Object} UIProduct - Enhanced Product for UI
 * @property {number} online - Số người đang chat (computed)
 * @property {string} seller - Tên seller (từ brand hoặc mặc định)
 * @property {string} sellerAvatar - Avatar seller (computed)
 * @property {string} time - Thời gian relative (computed)pa
 * @property {number} likes - Số lượt thích (computed)
 * @property {number} comments - Số bình luận (computed)
 * @property {number} shares - Số chia sẻ (computed)
 */

// API Functions
const api = {
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/products${queryString ? `?${queryString}` : ''}`;
    const response = await apiFetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch products'}`);
    }
    return response.json();
  },

  async getProductById(id) {
    const response = await apiFetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async getBrands() {
    const response = await apiFetch(`${API_BASE_URL}/products/brands`);
    if (!response.ok) throw new Error('Failed to fetch brands');
    return response.json();
  },

  async getCategories() {
    const response = await apiFetch(`${API_BASE_URL}/products/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  async logout() {
    await apiFetch(`${API_BASE_URL}/user/logout`, { method: 'POST' });
  },
};

// Utility functions
const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(price);
};

const getRelativeTime = (dateString) => {
  if (!dateString) {
    console.warn('No date provided for getRelativeTime');
    return 'Vừa xong';
  }
  
  const now = new Date();
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date format:', dateString);
    return 'Vừa xong';
  }
  
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Vài phút trước';
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 ngày trước';
  return `${diffInDays} ngày trước`;
};

const generateSellerAvatar = (userId, sellerName) => {
  // Tạo avatar dựa trên userId (nếu có) hoặc tên seller
  const seed = userId || sellerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://images.unsplash.com/photo-${1472099645785 + (seed % 1000)}?auto=format&fit=crop&q=80&w=50`;
};

const enrichProductForUI = (product) => {
  try {
    // Use user information from backend if available
    const seller = product.user?.name || product.brand?.name || 'Shop Official';
    const sellerAvatar = product.user?.avatar || generateSellerAvatar(product.userId, seller);
    
    const enriched = {
      ...product,
      price: formatPrice(product.price),
      online: Math.floor(Math.random() * 150) + 5, // Random online count (real-time data)
      seller,
      sellerAvatar,
      time: getRelativeTime(product.createdAt || product.updatedAt),
      // Use real data from entity, fallback to random for demo
      likes: product.likesCount || Math.floor(Math.random() * 50) + 5,
      comments: product.commentsCount || Math.floor(Math.random() * 20) + 1,
      shares: product.sharesCount || Math.floor(Math.random() * 10) + 1,
      // Additional UI fields from entity
      views: product.viewCount || 0,
      rating: product.rating || 0,
      ratingCount: product.ratingCount || 0,
      condition: product.condition || 'new',
      isFeatured: product.isFeatured || false,
      isTrending: product.isTrending || false,
      sellerNotes: product.sellerNotes
    };
    
    return enriched;
  } catch (error) {
    console.error('❌ Error enriching product:', error, 'Product:', product.name || product.id);
    return product; // Return original if enrichment fails
  }
};



// Dữ liệu chat giả lập lịch sử
const MOCK_HISTORY = [
  { id: 1, sender: 'Tuan Anh', text: 'Con này pin trâu không mọi người?', isMe: false },
  { id: 2, sender: 'Minh Hieu', text: 'Cũng ổn bác ơi, em dùng được hơn 1 ngày.', isMe: false },
  { id: 3, sender: 'Shop Official', text: 'Sản phẩm bên em cam kết chính hãng ạ!', isMe: false },
];

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  });

  const [currentRoom, setCurrentRoom] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  if (!currentUser) {
    return (
      <Login
        onLoginSuccess={(data) => {
          setCurrentUser({ id: data.id, username: data.username, email: data.email });
        }}
      />
    );
  }

  // Fetch products from API
  useEffect(() => {
    let isMounted = true; // Cleanup flag
    
    const fetchProducts = async () => {
      try {
        if (!isMounted) return; // Don't update state if component unmounted
        
        setLoading(true);
        setError(null);
        
        console.log('🚀 Fetching products...'); // Debug log
        
        const response = await api.getProducts({
          limit: 10,
          sortBy: 'updatedAt',
          sortOrder: 'DESC',
          isActive: true
        });
        
        if (!isMounted) return; // Don't update state if component unmounted
        
        console.log('✅ API Response received'); // Debug log
        
        // Handle different response formats
        let products = [];
        if (Array.isArray(response)) {
          products = response;
        } else if (response && response.data && Array.isArray(response.data.items)) {
          // API response format: { statusCode: 200, data: { items: [], total: 2 } }
          products = response.data.items;
        } else if (response && Array.isArray(response.items)) {
          // NestJS pagination format: { items: [], page: 1, limit: 10, total: 4 }
          products = response.items;
        } else if (response && Array.isArray(response.data)) {
          products = response.data;
        } else if (response && Array.isArray(response.products)) {
          products = response.products;
        } else {
          console.warn('Unexpected response format:', response);
          products = [];
        }
        
        console.log(`📦 Extracted ${products.length} products`); // Debug log
        
        const enrichedProducts = products.map(enrichProductForUI);
        
        if (!isMounted) return; // Don't update state if component unmounted
        
        setProducts(enrichedProducts);
        setError(null);
        console.log('🎉 Products loaded successfully'); // Debug log
      } catch (err) {
        if (!isMounted) return;
        if (err.code === 'UNAUTHORIZED') {
          localStorage.removeItem('user');
          setCurrentUser(null);
          return;
        }
        console.error('❌ Failed to fetch products:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle product creation
  const handleProductCreated = (newProduct) => {
    console.log('🎉 New product created:', newProduct);
    
    // Enrich new product for UI
    const enrichedProduct = enrichProductForUI(newProduct);
    
    // Add to beginning of products list
    setProducts(prevProducts => [enrichedProduct, ...prevProducts]);
    
    // Close create product modal
    setShowCreateProduct(false);
    
    // Show success message (you can enhance this with toast notifications)
    alert('✅ Sản phẩm đã được tạo thành công!');
  };

  const handleCancelCreate = () => {
    setShowCreateProduct(false);
  };

  if (loading && products.length === 0) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải sản phẩm...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <p>❌ {error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            🔄 Thử lại
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Always clear client state even if the server request fails
    } finally {
      localStorage.removeItem('user');
      setCurrentUser(null);
    }
  };

  return (
    <div className="app">
      {currentRoom ? (
        <ChatRoom product={currentRoom} onBack={() => setCurrentRoom(null)} />
      ) : (
        <ProductList
          products={products}
          onSelect={setCurrentRoom}
          onCreateProduct={() => setShowCreateProduct(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
      
      {/* Create Product Modal */}
      {showCreateProduct && (
        <CreateProduct 
          onProductCreated={handleProductCreated}
          onCancel={handleCancelCreate}
        />
      )}
    </div>
  );
}

// --- Component 1: Timeline Feed ---
function ProductList({ products, onSelect, onCreateProduct, currentUser, onLogout }) {
  return (
    <div className="timeline-container">
      {/* Header cố định */}
      <div className="timeline-header">
        <div className="header-content">
          <div>
            <h1>🛍️ TrustCircle Market</h1>
            <p>Khám phá và thảo luận các sản phẩm hot nhất</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUser && (
              <span style={{ fontSize: '0.85rem', color: '#555' }}>👤 {currentUser.username}</span>
            )}
            <button className="create-product-btn" onClick={onCreateProduct}>
              ➕ Tạo sản phẩm
            </button>
            <button
              className="create-product-btn"
              onClick={onLogout}
              style={{ background: '#6b7280' }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
      
      {/* Feed timeline */}
      <div className="timeline-feed">
        {products.map((product) => (
          <div key={product.id} className="feed-post">
            {/* Post header với thông tin seller */}
            <div className="post-header">
              <img src={product.sellerAvatar} alt={product.seller} className="seller-avatar" />
              <div className="seller-info">
                <h4>{product.seller}</h4>
                <span className="post-time">{product.time}</span>
              </div>
              <div className="post-options">⋯</div>
            </div>

            {/* Mô tả sản phẩm */}
            <div className="post-content">
              <p>{product.description}</p>
              {product.sellerNotes && (
                <div className="seller-notes">
                  <small>📝 {product.sellerNotes}</small>
                </div>
              )}
            </div>

            {/* Hình ảnh sản phẩm */}
            <div className="post-media" onClick={() => onSelect(product)}>
              <img 
                src={product.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'} 
                alt={product.name} 
                className="post-image"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600';
                }}
              />
              <div className="product-overlay">
                <h3>{product.name}</h3>
                <p className="product-price">{product.price}</p>
                <div className="product-meta">
                  {product.rating > 0 && (
                    <span className="rating">⭐ {product.rating} ({product.ratingCount})</span>
                  )}
                  <span className="condition">{product.condition === 'new' ? '🆕 Mới' : product.condition}</span>
                  {product.isFeatured && <span className="featured">🔥 Nổi bật</span>}
                  {product.isTrending && <span className="trending">📈 Trending</span>}
                </div>
                <div className="chat-indicator">
                  <div className="pulse-dot"></div>
                  <span>{product.online} người đang chat</span>
                  <span className="live-badge">LIVE</span>
                </div>
              </div>
            </div>

            {/* Post actions (Like, Comment, Share) */}
            <div className="post-actions">
              <div className="action-stats">
                <span>👍 {product.likes}</span>
                <span>💬 {product.comments} bình luận</span>
                <span>📤 {product.shares} chia sẻ</span>
              </div>
              <div className="action-buttons">
                <button className="action-btn like-btn">
                  👍 Thích
                </button>
                <button className="action-btn comment-btn" onClick={() => onSelect(product)}>
                  💬 Bình luận
                </button>
                <button className="action-btn share-btn">
                  📤 Chia sẻ
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Component 2: Phòng Chat (Chi tiết) ---
function ChatRoom({ product, onBack }) {
  const [messages, setMessages] = useState(MOCK_HISTORY);
  const [inputStr, setInputStr] = useState('');
  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputStr.trim() === '') return;

    // 1. Tạo tin nhắn của mình (Hiển thị ngay lập tức - Optimistic UI)
    const newMsg = {
      id: Date.now(),
      sender: 'Tôi',
      text: inputStr,
      isMe: true
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputStr('');

    // Giả lập bot hoặc người khác trả lời sau 2 giây (Chỉ để demo)
    setTimeout(() => {
        const replyMsg = {
            id: Date.now() + 1,
            sender: 'User_Random',
            text: 'Chuẩn đấy bác, giá này ngon rồi.',
            isMe: false
        };
        setMessages((prev) => [...prev, replyMsg]);
    }, 1500);
  };

  return (
    <div className="chat-page">
      <div className="chat-container compact">
        
        {/* Header của Box chat */}
        <div className="chat-header">
          <div className="product-mini-info">
            <button className="btn-back" onClick={onBack}>←</button>
            <img src={product.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'} alt="product" className="product-thumb" />
            <div className="product-details">
              <div className="product-name">{product.name}</div>
              <div className="online-status">
                <span className="online-dot"></span>
                {product.online} đang xem
              </div>
            </div>
          </div>
        </div>

        {/* Khu vực hiển thị tin nhắn */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.isMe ? 'me' : 'other'}`}>
              {!msg.isMe && <span className="sender-name">{msg.sender}</span>}
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Khu vực nhập liệu */}
        <div className="chat-input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Hỏi gì đó về sản phẩm này..."
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="btn-send" onClick={handleSend}>➤</button>
        </div>

      </div>
    </div>
  );
}

export default App;