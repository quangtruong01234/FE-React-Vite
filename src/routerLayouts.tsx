import { lazy, type ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RightRail } from '@/components/layout/RightRail';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Layout route components live here (not in router.tsx) so router.tsx exports
// only the non-component `router` object. A module that mixes component and
// non-component exports breaks React Fast Refresh
// (react-refresh/only-export-components).

// These pages are rendered directly by a layout (not via nested routes), so
// their lazy handles belong next to the layout that owns them.
const FeedPage     = lazy(() => import('@/features/social/FeedPage'));
const MessagesPage = lazy(() => import('@/features/chat/MessagesPage'));

export function AppLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}

export function MessagesLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell fixedHeight>
        <MessagesPage />
      </AppShell>
    </ProtectedRoute>
  );
}

export function FeedLayout(): ReactElement {
  return (
    <ProtectedRoute>
      <AppShell rightRail={<RightRail />}>
        <FeedPage />
      </AppShell>
    </ProtectedRoute>
  );
}
