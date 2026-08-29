import { type ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/format/utils';
import { getPrimaryNavItems, isNavItemActive } from './navItems';

/**
 * Bottom tab bar shown only on mobile (`md:hidden`) where the desktop
 * `LeftRail` is hidden. Mirrors the primary nav entries via `getPrimaryNavItems`;
 * the rail's role consoles move into the profile dropdown at this width.
 */
export function MobileNav(): ReactElement {
  const location = useLocation();
  const items = getPrimaryNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-canvas-surface/95 border-t border-bdr backdrop-blur-md">
      <div className="flex items-stretch justify-around px-1">
        {items.map((item) => {
          const active = isNavItemActive(item, location.pathname);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-1 flex-1 min-w-0 py-2 transition-colors',
                active ? 'text-accent-amber' : 'text-ink-muted',
              )}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="font-body text-[10px] leading-none truncate max-w-full">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
