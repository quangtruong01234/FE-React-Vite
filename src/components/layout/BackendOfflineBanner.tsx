import { type ReactElement } from 'react';
import { CalendarClock } from 'lucide-react';
import {
  BACKEND_OFFLINE_NOTICE,
  DEMO_GUIDE_URL,
  isDemoMode,
} from '@/lib/demo/backendStatus';

/**
 * Says the backend is parked on a schedule, not broken.
 *
 * Rendered above the router (not inside `AppShell`) so it also covers `/login`,
 * which is where a visitor lands if the demo mocks fail to start — the one case
 * where the explanation matters most.
 *
 * In document flow rather than `fixed`: `Header` is `sticky top-0 z-[100]` and
 * would sit on top of a fixed banner, and the messages route is `h-screen`.
 * In flow, the banner shows at the top of the page and the header slides over
 * it on scroll, with no layout to patch.
 *
 * Not dismissible — the schedule is a state that lasts the whole visit, and the
 * banner disappears on its own the next time the gateway answers.
 */
export function BackendOfflineBanner(): ReactElement | null {
  if (!isDemoMode()) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-tb-amber/30 bg-tb-amber/10 px-5 py-3"
    >
      <CalendarClock size={16} className="shrink-0 text-accent-amber" />
      <p className="m-0 min-w-0 flex-1 font-body text-xs text-accent-amber">
        {BACKEND_OFFLINE_NOTICE}
      </p>
      <a
        href={DEMO_GUIDE_URL}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-tb-input border border-tb-amber/40 bg-canvas-elevated px-3 py-1.5 font-body text-xs font-semibold text-accent-amber transition-colors hover:border-tb-amber/70"
      >
        Demo guide
      </a>
    </div>
  );
}
