import { type ReactElement, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import LoginPage from '@/features/auth/LoginPage';
import ProductListPage from '@/features/product/ProductListPage';
import ProductDetail from '@/features/product/ProductDetail';
import CheckoutPage from '@/features/cart/CheckoutPage';
import OrderHistoryPage from '@/features/order/OrderHistoryPage';
import CartSidebar from '@/features/cart/CartSidebar';

function RequireAuth({ children }: { children: ReactNode }): ReactElement {
  const { currentUser } = useAuthContext();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootLayout(): ReactElement {
  return (
    <>
      <Outlet />
      <CartSidebar />
    </>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RootLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ProductListPage /> },
      { path: 'product/:id', element: <ProductDetail /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrderHistoryPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
