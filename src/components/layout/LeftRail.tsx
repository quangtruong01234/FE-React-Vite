import { type ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/format/utils';
import { userDisplayName, userFallback } from '@/lib/format/user';
import { Avatar } from '@/components/shared/Avatar';
import { useRole } from '@/hooks/auth/useRole';
import {
  getPrimaryNavItems, isNavItemActive, SELLER_NAV_ITEMS, ADMIN_NAV_ITEMS, type NavItem,
} from './navItems';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { layoutMessages } from './layout.i18n';

export function LeftRail({ fullHeight }: { fullHeight?: boolean } = {}): ReactElement {
  const location = useLocation();
  const roleState = useRole();
  const t = useT(layoutMessages);
  const { lang } = useLanguage();

  const me = roleState?.me;
  const isSeller = roleState?.isSeller ?? false;
  const isAdmin = roleState?.isAdmin ?? false;

  const navItems = getPrimaryNavItems();

  /**
   * Row highlight shared by both blocks. An amber tint, not `canvas-elevated`:
   * in the light theme elevated (#F4F4F5) sits on a #FAFAFA canvas and the
   * hover / active row all but vanishes. Amber-on-/15 stays inside the chip
   * contrast pinned in themeTokens.test.ts (amber on /20).
   */
  function rowClass(active: boolean): string {
    return cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-tb-input cursor-pointer transition-colors w-full',
      active ? 'bg-tb-amber/15' : 'hover:bg-tb-amber/10',
    );
  }

  /** Top block: the active entry gets the gradient chip. */
  function renderPrimary(item: NavItem): ReactElement {
    const active = isNavItemActive(item, location.pathname);
    return (
      <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
        <span className={cn(
          'size-8 rounded-full flex-none grid place-items-center',
          active ? 'bg-tb-gradient text-ink-on-accent' : 'bg-canvas-elevated text-accent-amber',
        )}>
          <item.icon size={16} className="shrink-0" />
        </span>
        <span className={cn(
          'flex-1 font-body text-sm',
          active ? 'text-accent-amber font-semibold' : 'text-ink-pri font-medium',
        )}>
          {t(item.labelKey)}
        </span>
      </Link>
    );
  }

  /** Role blocks (seller / admin): amber chip throughout, row highlight only. */
  function renderRoleItem(item: NavItem): ReactElement {
    const active = isNavItemActive(item, location.pathname);
    return (
      <Link key={item.to} to={item.to} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
        <span className="size-8 rounded-full bg-tb-amber/10 text-accent-amber flex-none grid place-items-center">
          <item.icon size={16} className="shrink-0" />
        </span>
        <span className={cn('flex-1 font-body font-semibold text-sm', active ? 'text-accent-amber' : 'text-ink-pri')}>
          {t(item.labelKey)}
        </span>
      </Link>
    );
  }

  return (
    <aside className={cn('hidden md:flex flex-col gap-1', fullHeight ? 'h-full overflow-y-auto pb-6' : 'sticky top-[76px] self-start pb-20')}>
      {/* Identity card, not a link: the profile page belongs to the avatar dropdown. */}
      {me && (
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <Avatar src={me.avatar ?? undefined} alt={me.username} size={38} />
          <div className="min-w-0">
            <div className="font-body font-semibold text-sm text-ink-pri truncate">{userDisplayName(me, userFallback(lang), lang)}</div>
            <div className="text-xs text-ink-muted truncate">
              {isAdmin ? t('roleAdmin') : isSeller ? t('roleSeller') : `@${me.username}`}
            </div>
          </div>
        </div>
      )}

      {navItems.map(renderPrimary)}

      {isSeller && (
        <>
          <div className="h-px bg-bdr mx-3 my-2.5" />
          {SELLER_NAV_ITEMS.map(renderRoleItem)}
        </>
      )}

      {isAdmin && (
        <>
          <div className="h-px bg-bdr mx-3 my-2.5" />
          {ADMIN_NAV_ITEMS.map(renderRoleItem)}
        </>
      )}
    </aside>
  );
}
