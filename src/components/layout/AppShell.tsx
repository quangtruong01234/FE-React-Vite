import { type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Header } from './Header';
import { LeftRail } from './LeftRail';
import { MobileNav } from './MobileNav';
import { RightRail } from './RightRail';
import { GlobalCreatePost } from '@/features/social/GlobalCreatePost';

interface AppShellProps {
  children: ReactNode;
  rightRail?: ReactNode;
  fixedHeight?: boolean;
}

export function AppShell({ children, rightRail, fixedHeight }: AppShellProps): ReactElement {
  if (fixedHeight) {
    return (
      <div className="h-screen overflow-hidden bg-canvas-base flex flex-col">
        <Header />
        <div className="flex-1 overflow-hidden grid md:grid-cols-[210px_minmax(0,1fr)] px-5 pt-6 gap-6 min-h-0 items-stretch">
          <LeftRail fullHeight />
          <main className="min-w-0 min-h-0 overflow-hidden">{children}</main>
        </div>
        <GlobalCreatePost />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-base">
      <Header />
      <div
        className={cn(
          'w-full px-5 pt-6 pb-24 grid gap-6 items-start',
          rightRail !== undefined
            ? 'md:grid-cols-[210px_1fr] lg:grid-cols-[240px_minmax(0,1fr)_320px]'
            : 'md:grid-cols-[210px_minmax(0,1fr)]',
        )}
      >
        <LeftRail />
        <main className="min-w-0">{children}</main>
        {rightRail !== undefined && <RightRail />}
      </div>
      <MobileNav />
      <GlobalCreatePost />
    </div>
  );
}
