import { type ReactElement } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';
import { LiveBadge } from './LiveBadge';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: number;
  showLive?: boolean;
  className?: string;
}

export function Avatar({
  src,
  alt = '',
  initials,
  size = 40,
  showLive = false,
  className,
}: AvatarProps): ReactElement {
  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ '--avatar-sz': `${size}px`, '--avatar-fs': `${size * 0.35}px` } as React.CSSProperties}
    >
      <div className="rounded-full p-[2px] w-[var(--avatar-sz)] h-[var(--avatar-sz)] bg-tb-gradient">
        <div className="rounded-full p-[2px] w-full h-full bg-tb-base">
          {src ? (
            <img src={src} alt={alt} className="w-full h-full rounded-full object-cover block" />
          ) : (
            <div className="w-full h-full rounded-full flex items-center justify-center font-display font-black text-white uppercase bg-canvas-elevated text-[var(--avatar-fs)]">
              {initials ?? alt.charAt(0)}
            </div>
          )}
        </div>
      </div>
      {showLive && (
        <span className="absolute -bottom-1 -right-1">
          <LiveBadge className="text-[9px] px-1 py-px gap-1" />
        </span>
      )}
    </div>
  );
}
