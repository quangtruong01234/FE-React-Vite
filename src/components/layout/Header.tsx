import { Fragment, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { HeaderSearch } from '@/features/search/HeaderSearch';
import { useCart } from '@/hooks/data/useCart';
import { useRole } from '@/hooks/auth/useRole';
import { useChatPresence } from '@/features/chat/useChat';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';
import { openCreatePost } from '@/features/social/composerEvents';
import { HEADER_ICON_ITEMS } from './navItems';

export function Header(): ReactElement {
  const { data: cart } = useCart();
  const totalCount = cart?.items.length ?? 0;

  // App-wide chat sound: play a beep for any incoming message while online.
  useChatPresence(useRole()?.me?.id);

  return (
    <header className="sticky top-0 z-[100] bg-canvas-surface/85 border-b border-bdr backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-5">
        <Link to="/" className="flex-none">
          <span className="font-display font-black text-[2rem] tracking-tight uppercase text-ink-pri">
            Try<span className="bg-tb-gradient-90 bg-clip-text text-transparent">Buy</span>
          </span>
        </Link>

        <HeaderSearch />

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <GradientButton
            size="sm"
            className="rounded-full px-3 sm:px-4 py-2 text-sm"
            onClick={openCreatePost}
          >
            <Plus size={15} className="shrink-0" />
            <span className="hidden sm:inline">Tạo bài viết</span>
          </GradientButton>

          {/* Messages · [bell] · wishlist · cart — destinations come from the shared
              registry so no other menu can claim one of them. */}
          {HEADER_ICON_ITEMS.map((item, i) => (
            <Fragment key={item.to}>
              <Link
                to={item.to}
                aria-label={item.label}
                className="relative bg-canvas-elevated border border-bdr text-ink-pri rounded-tb-input p-2.5 grid place-items-center hover:border-accent-amber transition-colors overflow-visible"
              >
                <item.icon size={20} className="shrink-0" />
                {item.to === '/cart' && totalCount > 0 && (
                  <span className={cn(
                    'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1',
                    'bg-tb-gradient text-white font-body font-bold text-[10px]',
                    'rounded-full border-2 border-tb-base flex items-center justify-center leading-none',
                  )}>
                    {totalCount}
                  </span>
                )}
              </Link>
              {i === 0 && <NotificationBell />}
            </Fragment>
          ))}

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
