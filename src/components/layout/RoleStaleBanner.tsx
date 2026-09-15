import { type ReactElement } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '@/hooks/auth/useRole';
import { useAuthContext } from '@/context/useAuthContext';
import { roleStaleNotice } from '@/lib/auth/roleLabels';

/**
 * Tells a user whose role changed mid-session that their session is running on
 * the old role, and that only a fresh login fixes it (ROLE-ADMIN-01, 2026-09-16).
 *
 * Before `isRoleStale` existed this session had no way to know: the admin who
 * made the change saw a notice, the person it happened to saw nothing — their
 * seller links either silently vanished or silently failed to appear.
 *
 * Not dismissible, and that is deliberate: the mismatch is not an event that
 * passes, it is a state that lasts until the user signs in again — at which
 * point the banner disappears on its own. It sits in `AppShell`, so it shows on
 * every authenticated page rather than on whichever one they happen to open.
 */
export function RoleStaleBanner(): ReactElement | null {
  const roleState = useRole();
  const navigate = useNavigate();
  // Central logout (useAuth): clears the cache and broadcasts to other tabs.
  const { logout } = useAuthContext();

  if (!roleState?.isRoleStale) return null;

  return (
    <div
      role="status"
      className="shrink-0 mx-5 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 bg-tb-amber/10 border border-tb-amber/30 rounded-tb-input px-4 py-3"
    >
      <ShieldAlert size={16} className="shrink-0 text-accent-amber" />
      <p className="flex-1 min-w-0 font-body text-xs text-accent-amber">
        {roleStaleNotice(roleState.me.role.name, roleState.roleName)}
      </p>
      <button
        onClick={() => logout({ onSuccess: () => void navigate('/login') })}
        className="shrink-0 px-3 py-1.5 rounded-tb-input border border-tb-amber/40 bg-canvas-elevated text-accent-amber font-body font-semibold text-xs cursor-pointer hover:border-tb-amber/70 transition-colors"
      >
        Đăng xuất
      </button>
    </div>
  );
}
