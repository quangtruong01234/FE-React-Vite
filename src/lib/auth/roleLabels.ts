import type { RoleName } from '@/types';
import type { Lang } from '@/lib/i18n/lang';

/**
 * Human-facing strings for a role name. Display only — the raw name is what goes
 * on the wire (ROLE-ADMIN-01), so never send a label back to the backend.
 *
 * Lives in `lib/` rather than in `features/admin/`: two unrelated surfaces read
 * it now — the admin user table and the session banner in the app shell — and a
 * layout component must not import from a feature folder (DRY — Logic).
 */
const ROLE_LABELS: Record<Lang, Record<RoleName, string>> = {
  vi: {
    user: 'Người mua',
    shop: 'Người bán',
    admin: 'Quản trị',
    logistics_operator: 'Vận hành GHN',
    shipping_manager: 'Quản lý vận chuyển',
  },
  en: {
    user: 'Buyer',
    shop: 'Seller',
    admin: 'Admin',
    logistics_operator: 'GHN operator',
    shipping_manager: 'Shipping manager',
  },
};

/** Falls back to the raw name so a role added backend-side still renders. */
export function roleLabel(name: string, lang: Lang = 'vi'): string {
  return ROLE_LABELS[lang][name as RoleName] ?? name;
}

/**
 * What the banner tells a user whose role changed mid-session.
 *
 * Names **both** roles on purpose, because the mismatch runs in two directions
 * and only one of them is good news: promoted (`user` → `shop`) means the new
 * powers are not active yet, demoted (`shop` → `user`) means the session is
 * still running on powers the account no longer has. A single "vai trò đã thay
 * đổi" line would leave the user guessing which one they are in — and in the
 * demoted case, guessing wrong is the expensive direction.
 *
 * The instruction is the same either way: only a fresh login re-mints the token
 * (the backend revokes nothing — JWT is stateless, there is no blacklist).
 */
export function roleStaleNotice(dbRole: string, tokenRole: string, lang: Lang = 'vi'): string {
  const next = roleLabel(dbRole, lang);
  const current = roleLabel(tokenRole, lang);
  if (lang === 'en') {
    return (
      `Your role was just changed to "${next}". ` +
      `This session is still running with "${current}" permissions — ` +
      'log out and sign in again to apply the new role.'
    );
  }
  return (
    `Vai trò của bạn vừa được đổi thành "${next}". ` +
    `Phiên đăng nhập hiện tại vẫn đang chạy với quyền "${current}" — ` +
    'đăng xuất và đăng nhập lại để áp dụng vai trò mới.'
  );
}
