import './ProductList.css';

export default function ProductList({ products, onSelect, onCreateProduct, currentUser, onLogout, cartCount, onOpenCart, onOpenOrderHistory }) {
  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="header-content">
          <div>
            <h1>🛍️ TrustCircle Market</h1>
            <p>Khám phá và thảo luận các sản phẩm hot nhất</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {currentUser && (
              <span style={{ fontSize: '0.85rem', color: '#555' }}>👤 {currentUser.username}</span>
            )}
            <button className="create-product-btn" onClick={onCreateProduct}>
              ➕ Tạo sản phẩm
            </button>
            <button
              className="create-product-btn"
              onClick={onOpenOrderHistory}
              style={{ background: '#0ea5e9' }}
            >
              📦 Đơn hàng
            </button>
            <button
              className="create-product-btn"
              onClick={onOpenCart}
              style={{ background: '#6366f1', position: 'relative' }}
            >
              🛒 Giỏ hàng{cartCount > 0 ? ` (${cartCount})` : ''}
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

      <div className="timeline-feed">
        {products.map((product) => (
          <div key={product.id} className="feed-post">
            <div className="post-header">
              <img src={product.sellerAvatar} alt={product.seller} className="seller-avatar" />
              <div className="seller-info">
                <h4>{product.seller}</h4>
                <span className="post-time">{product.time}</span>
              </div>
              <div className="post-options">⋯</div>
            </div>

            <div className="post-content">
              <p>{product.description}</p>
              {product.sellerNotes && (
                <div className="seller-notes">
                  <small>📝 {product.sellerNotes}</small>
                </div>
              )}
            </div>

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

            <div className="post-actions">
              <div className="action-stats">
                <span>👍 {product.likes}</span>
                <span>💬 {product.comments} bình luận</span>
                <span>📤 {product.shares} chia sẻ</span>
              </div>
              <div className="action-buttons">
                <button className="action-btn like-btn">👍 Thích</button>
                <button className="action-btn comment-btn" onClick={() => onSelect(product)}>
                  💬 Bình luận
                </button>
                <button className="action-btn share-btn">📤 Chia sẻ</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
