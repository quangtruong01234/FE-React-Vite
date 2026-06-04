import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RightRail } from '@/components/layout/RightRail';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import CartSidebar from '@/features/cart/CartSidebar';

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
const AdminPage          = lazy(() => import('@/features/admin/AdminPage'));

function AppLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
      <CartSidebar />
    </ProtectedRoute>
  );
}

function MessagesLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell fixedHeight>
        <MessagesPage />
      </AppShell>
      <CartSidebar />
    </ProtectedRoute>
  );
}

function FeedLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell rightRail={<RightRail />}>
        <FeedPage />
      </AppShell>
      <CartSidebar />
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
      { path: 'checkout',          element: <CheckoutPage /> },
      { path: 'orders',            element: <OrderHistoryPage /> },
      { path: 'order/:id',         element: <OrderDetailPage /> },
      { path: 'payment-result',    element: <PaymentResultPage /> },
      { path: 'profile/:id',       element: <ProfilePage /> },
      { path: 'notifications',     element: <NotificationsPage /> },
      {
        path: 'shop',
        element: (
          <ProtectedRoute requiredRole="seller">
            <ShopPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
