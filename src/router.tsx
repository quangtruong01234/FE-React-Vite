import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ApiErrorState } from '@/components/shared/ApiErrorState';
import { registerUnauthorizedHandler } from '@/api';
import { AppShell } from '@/components/layout/AppShell';
import { RightRail } from '@/components/layout/RightRail';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
const LoginPage          = lazy(() => import('@/features/auth/LoginPage'));
const FeedPage           = lazy(() => import('@/features/social/FeedPage'));
const PostDetailPage     = lazy(() => import('@/features/social/PostDetailPage'));
const MarketplacePage    = lazy(() => import('@/features/product/MarketplacePage'));
const ProductDetail      = lazy(() => import('@/features/product/ProductDetail'));
const CheckoutPage       = lazy(() => import('@/features/cart/CheckoutPage'));
const OrderHistoryPage   = lazy(() => import('@/features/order/OrderHistoryPage'));
const ProfilePage        = lazy(() => import('@/features/user/ProfilePage'));
const MessagesPage       = lazy(() => import('@/features/chat/MessagesPage'));
const NotificationsPage  = lazy(() => import('@/features/notifications/NotificationsPage'));
const OrderDetailPage    = lazy(() => import('@/features/order/OrderDetailPage'));
const PaymentResultPage  = lazy(() => import('@/features/payment/PaymentResultPage'));
const ShopPage           = lazy(() => import('@/features/shop/ShopPage'));
const AdminPage               = lazy(() => import('@/features/admin/AdminPage'));
const PendingBrandsPage       = lazy(() => import('@/features/admin/PendingBrandsPage'));
const PendingCategoriesPage   = lazy(() => import('@/features/admin/PendingCategoriesPage'));
const CreateProductPage       = lazy(() => import('@/features/product/CreateProductPage'));
const CartPage           = lazy(() => import('@/features/cart/CartPage'));
const SellerOrdersPage   = lazy(() => import('@/features/order/SellerOrdersPage'));

function AppLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}

function MessagesLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell fixedHeight>
        <MessagesPage />
      </AppShell>
    </ProtectedRoute>
  );
}

function FeedLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell rightRail={<RightRail />}>
        <FeedPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    index: true,
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <FeedLayout />
      </Suspense>
    ),
  },
  {
    path: '/messages',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <MessagesLayout />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <Suspense fallback={<PageSkeleton />}>
        <AppLayout />
      </Suspense>
    ),
    children: [
      { path: 'post/:id',          element: <PostDetailPage /> },
      { path: 'marketplace',       element: <MarketplacePage /> },
      { path: 'product/:id',       element: <ProductDetail /> },
      { path: 'cart',               element: <CartPage /> },
      { path: 'checkout',          element: <CheckoutPage /> },
      { path: 'orders',            element: <OrderHistoryPage /> },
      { path: 'order/:id',         element: <OrderDetailPage /> },
      { path: 'payment-result',    element: <PaymentResultPage /> },
      { path: 'profile/:id',       element: <ProfilePage /> },
      { path: 'notifications',     element: <NotificationsPage /> },
      {
        path: 'shop',
        element: (
          <ProtectedRoute requiredRole="shop">
            <ShopPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sell',
        element: (
          <ProtectedRoute requiredRole="shop">
            <CreateProductPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sell/orders',
        element: (
          <ProtectedRoute requiredRole="shop">
            <SellerOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'sell/:id',
        element: (
          <ProtectedRoute requiredRole="shop">
            <CreateProductPage />
          </ProtectedRoute>
        ),
      },
      { path: '*', element: <ApiErrorState error={{ statusCode: 404, status: 404, message: 'Not found' }} /> },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/brands/pending',
        element: (
          <ProtectedRoute requiredRole="admin">
            <PendingBrandsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/categories/pending',
        element: (
          <ProtectedRoute requiredRole="admin">
            <PendingCategoriesPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> }, // fallback nếu chưa login (ProtectedRoute redirect /login trước)
]);

registerUnauthorizedHandler(to => { void router.navigate(to); });
