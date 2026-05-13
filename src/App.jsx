import { useState } from 'react';
import './App.css';
import { useAuth } from './shared/hooks/useAuth.js';
import { useProduct } from './features/product/useProduct.js';
import LoginPage from './features/auth/LoginPage.jsx';
import ProductList from './features/product/ProductList.jsx';
import ChatRoom from './features/product/ChatRoom.jsx';
import CreateProductModal from './features/product/CreateProductModal.jsx';

function App() {
  const { currentUser, loginSuccess, handleUnauthorized, logout } = useAuth();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  const { products, loading, error, addProduct } = useProduct(!!currentUser, handleUnauthorized);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={loginSuccess} />;
  }

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

  const handleProductCreated = (newProduct) => {
    addProduct(newProduct);
    setShowCreateProduct(false);
    alert('✅ Sản phẩm đã được tạo thành công!');
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
          onLogout={logout}
        />
      )}

      {showCreateProduct && (
        <CreateProductModal
          onProductCreated={handleProductCreated}
          onCancel={() => setShowCreateProduct(false)}
        />
      )}
    </div>
  );
}

export default App;
