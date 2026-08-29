import {
  Home, Store, Package, User, MapPin, Undo2, ClipboardList, TicketPercent,
  BarChart3, LayoutDashboard, Tag, Layers, Flag, ShieldAlert, Bell, MessageSquare, Heart,
  ShoppingCart, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  to: string;
  /** Active only on an exact match — for a parent whose children have their own entries. */
  exact?: boolean;
  /** Routes nested under `to` that own a separate entry, so they must not light this one up. */
  excludes?: string[];
  /** Extra routes that light this entry — pages reached from it that have no entry of their own. */
  includes?: string[];
}

export interface PrimaryNavItem extends NavItem {
  /** Short label for the mobile bottom nav (limited width). */
  shortLabel: string;
}

/**
 * Every destination reachable from the app chrome lives in this file, and each
 * one appears in **exactly one** group. Two entries pointing at the same page is
 * the bug this layout is written to prevent: the user cannot tell the two apart,
 * and whichever one they don't use looks broken. `chromeDestinations()` +
 * `navItems.test.ts` hold that line.
 *
 * Who owns what:
 * - header icons — messages, notifications (the bell, which also carries the
 *   unread badge and the preview), wishlist, cart;
 * - profile menu — everything personal: the user's own profile, their orders,
 *   their returns, their addresses;
 * - left rail — the places that are not about one person: the feed, the
 *   marketplace, and the seller / admin consoles. The rail also feeds the mobile
 *   bottom bar, which renders `getPrimaryNavItems()` only.
 *
 * The brand logo (→ `/`) is deliberately not in here: it is a home affordance
 * every site has, not a menu entry, so it is exempt from the one-place rule.
 */

/** Rail + mobile bottom bar — public places, nothing account-specific. */
export function getPrimaryNavItems(): PrimaryNavItem[] {
  return [
    { icon: Home, label: 'Bảng tin', shortLabel: 'Bảng tin', to: '/' },
    { icon: Store, label: 'Chợ sản phẩm', shortLabel: 'Chợ', to: '/marketplace' },
  ];
}

/** The avatar dropdown, at every width — the user's own pages and data. */
export function getAccountMenuItems(me: { id: string } | null | undefined): NavItem[] {
  if (!me) return [];
  return [
    { icon: User, label: 'Trang cá nhân', to: `/profile/${me.id}` },
    { icon: Package, label: 'Đơn mua', to: '/orders' },
    { icon: Undo2, label: 'Trả hàng', to: '/returns' },
    { icon: MapPin, label: 'Sổ địa chỉ', to: '/addresses' },
  ];
}

export const SELLER_NAV_ITEMS: NavItem[] = [
  // Creating / editing a product (`/sell`, `/sell/:id`) is reached from the
  // "Đăng sản phẩm" button inside this console, so it gets no entry of its own —
  // it just keeps this one lit.
  {
    icon: Store,
    label: 'Kênh người bán',
    to: '/shop',
    includes: ['/sell'],
    excludes: ['/shop/analytics', '/sell/orders', '/sell/returns', '/sell/vouchers'],
  },
  { icon: ClipboardList, label: 'Đơn bán', to: '/sell/orders' },
  { icon: Undo2, label: 'Trả hàng của shop', to: '/sell/returns' },
  // "shop" qualifies it: an account that is both seller and admin also has the
  // platform-wide "Mã giảm giá" entry in the admin block.
  { icon: TicketPercent, label: 'Mã giảm giá shop', to: '/sell/vouchers' },
  { icon: BarChart3, label: 'Thống kê bán hàng', to: '/shop/analytics' },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Quản trị sàn', to: '/admin', exact: true },
  { icon: Tag, label: 'Duyệt thương hiệu', to: '/admin/brands/pending' },
  { icon: Layers, label: 'Duyệt danh mục', to: '/admin/categories/pending' },
  { icon: Flag, label: 'Kiểm duyệt bài viết', to: '/admin/reports' },
  { icon: ShieldAlert, label: 'Rủi ro sản phẩm', to: '/admin/product-risk' },
  { icon: TicketPercent, label: 'Mã giảm giá', to: '/admin/vouchers' },
  { icon: BarChart3, label: 'Thống kê toàn sàn', to: '/admin/analytics' },
];

/** Header icon buttons, left to right; the bell sits between the first and the second. */
export const HEADER_ICON_ITEMS: NavItem[] = [
  { icon: MessageSquare, label: 'Tin nhắn', to: '/messages' },
  { icon: Heart, label: 'Yêu thích', to: '/wishlist' },
  { icon: ShoppingCart, label: 'Giỏ hàng', to: '/cart' },
];

/** Owned by `NotificationBell` — the rail deliberately has no notifications entry. */
export const NOTIFICATIONS_NAV_ITEM: NavItem = {
  icon: Bell, label: 'Thông báo', to: '/notifications',
};

/**
 * The rail's role consoles. Below `md` the rail is hidden, so the dropdown
 * carries these — only there, so no width shows two entries for one page.
 */
export function getRoleNavItems(roles: { isSeller: boolean; isAdmin: boolean }): NavItem[] {
  return [
    ...(roles.isSeller ? SELLER_NAV_ITEMS : []),
    ...(roles.isAdmin ? ADMIN_NAV_ITEMS : []),
  ];
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Is `pathname` inside the route this entry points at? */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact || item.to === '/') return pathname === item.to;
  if (item.excludes?.some(prefix => matchesPrefix(pathname, prefix))) return false;
  return [item.to, ...(item.includes ?? [])].some(prefix => matchesPrefix(pathname, prefix));
}

/** Every chrome destination for one user, for the "no two entries share a page" test. */
export function chromeDestinations(
  me: { id: string } | null,
  roles: { isSeller: boolean; isAdmin: boolean },
): string[] {
  return [
    ...getPrimaryNavItems(),
    ...getAccountMenuItems(me),
    // rail on desktop, dropdown on mobile — one copy either way, so one entry here
    ...getRoleNavItems(roles),
    ...HEADER_ICON_ITEMS,
    NOTIFICATIONS_NAV_ITEM,
  ].map(item => item.to);
}
