import { type ReactElement } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton(): ReactElement {
  return (
    <div className="min-h-screen bg-canvas-base flex flex-col gap-6 p-6">
      <Skeleton className="h-14 w-full rounded-tb-card bg-canvas-elevated" />
      <div className="flex gap-6">
        <Skeleton className="h-[600px] w-52 rounded-tb-card bg-canvas-elevated hidden md:block" />
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-48 w-full rounded-tb-card bg-canvas-elevated" />
          <Skeleton className="h-48 w-full rounded-tb-card bg-canvas-elevated" />
          <Skeleton className="h-48 w-full rounded-tb-card bg-canvas-elevated" />
        </div>
      </div>
    </div>
  );
}
