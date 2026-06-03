import { type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Header } from './Header';
import { LeftRail } from './LeftRail';
import { RightRail } from './RightRail';

interface AppShellProps {
  children: ReactNode;
  rightRail?: ReactNode;
}

export function AppShell({ children, rightRail }: AppShellProps): ReactElement {
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
    </div>
  );
}
