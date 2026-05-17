import { useState } from 'react';
import './App.css';
import { useAuth } from './shared/hooks/useAuth.js';
import { useProduct } from './features/product/useProduct.js';
import LoginPage from './features/auth/LoginPage.jsx';
import ProductList from './features/product/ProductList.jsx';
import ProductDetail from './features/product/ProductDetail.jsx';
import CreateProductModal from './features/product/CreateProductModal.jsx';
import CartSidebar from './features/cart/CartSidebar.jsx';
import CheckoutPage from './features/cart/CheckoutPage.jsx';
import OrderHistoryPage from './features/order/OrderHistoryPage.jsx';

function App() {
  const { currentUser, loginSuccess, handleUnauthorized, logout } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  const { products, loading, error, refetch } = useProduct(!!currentUser, handleUnauthorized);

  function addToCart(item) {
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
    setShowCart(true);
  }

  function updateCartQty(productId, qty) {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(i => i.product_id !== productId));
    } else {
      setCartItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i));
    }
  }

  function removeFromCart(productId) {
    setCartItems(prev => prev.filter(i => i.product_id !== productId));
  }

  function handleOrderSuccess(order) {
    setCartItems([]);
    setShowCheckout(false);
    setSelectedProduct(null);
    alert(`Đặt hàng thành công! Mã đơn hàng: #${order?.id ?? ''}`);
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={loginSuccess} />;
  }

  if (showCheckout) {
    return (
      <CheckoutPage
        cartItems={cartItems}
        onBack={() => setShowCheckout(false)}
        onOrderSuccess={handleOrderSuccess}
      />
    );
  }

  if (showOrderHistory) {
    return (
      <OrderHistoryPage
        currentUser={currentUser}
        onBack={() => setShowOrderHistory(false)}
      />
    );
  }

  if (selectedProduct) {
    return (
      <>
        <ProductDetail
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          cartItems={cartItems}
        />
        {showCart && (
          <CartSidebar
            cartItems={cartItems}
            onUpdateQty={updateCartQty}
            onRemove={removeFromCart}
            onClose={() => setShowCart(false)}
            onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
          />
        )}
      </>
    );
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
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <ProductList
        products={products}
        onSelect={setSelectedProduct}
        onCreateProduct={() => setShowCreateProduct(true)}
        currentUser={currentUser}
        onLogout={logout}
        cartCount={cartItems.reduce((sum, i) => sum + i.quantity, 0)}
        onOpenCart={() => setShowCart(true)}
        onOpenOrderHistory={() => setShowOrderHistory(true)}
      />

      {showCart && (
        <CartSidebar
          cartItems={cartItems}
          onUpdateQty={updateCartQty}
          onRemove={removeFromCart}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
        />
      )}

      {showCreateProduct && (
        <CreateProductModal
          onProductCreated={() => { refetch(); setShowCreateProduct(false); }}
          onCancel={() => setShowCreateProduct(false)}
        />
      )}
    </div>
  );
}

export default App;
