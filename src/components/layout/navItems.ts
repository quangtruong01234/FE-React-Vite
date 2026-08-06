import { Home, Store, Bell, Package, User, type LucideIcon } from 'lucide-react';

export interface PrimaryNavItem {
  icon: LucideIcon;
  /** Full label for the desktop LeftRail. */
  label: string;
  /** Short label for the mobile bottom nav (limited width). */
  shortLabel: string;
  to: string;
}

/**
 * Primary navigation entries shared by the desktop `LeftRail` and the mobile
 * `MobileNav`. Keeping a single source avoids the two drifting apart.
 */
export function getPrimaryNavItems(me?: { id: string } | null): PrimaryNavItem[] {
  return [
    { icon: Home, label: 'Bảng tin', shortLabel: 'Bảng tin', to: '/' },
    { icon: Store, label: 'Chợ sản phẩm', shortLabel: 'Chợ', to: '/marketplace' },
    { icon: Bell, label: 'Thông báo', shortLabel: 'Thông báo', to: '/notifications' },
    { icon: Package, label: 'Đơn mua', shortLabel: 'Đơn mua', to: '/orders' },
    ...(me
      ? [{ icon: User, label: 'Trang cá nhân', shortLabel: 'Cá nhân', to: `/profile/${me.id}` }]
      : []),
  ];
}
