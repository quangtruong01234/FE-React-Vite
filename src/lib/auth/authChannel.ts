/**
 * Cross-tab auth sync via BroadcastChannel.
 *
 * TanStack Query cache is per-tab: when tab A logs out (or logs in as a
 * different account), tab B keeps serving the old session from its own cache
 * until some request happens to hit a 401. Broadcasting the auth change lets
 * every other tab `queryClient.clear()` immediately — `auth.me` refetches and
 * `ProtectedRoute` redirects to /login if the session is gone.
 *
 * Post and subscribe share one channel object per tab: BroadcastChannel never
 * delivers a message back to the object that sent it, so the acting tab does
 * not react to its own event.
 */

export interface AuthChannelEvent {
  type: 'login' | 'logout';
}

const CHANNEL_NAME = 'trybuy-auth';

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  // Not available in some test environments — degrade to single-tab behavior.
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function isAuthChannelEvent(data: unknown): data is AuthChannelEvent {
  if (typeof data !== 'object' || data === null || !('type' in data)) return false;
  const type = (data as { type: unknown }).type;
  return type === 'login' || type === 'logout';
}

export function postAuthEvent(event: AuthChannelEvent): void {
  getChannel()?.postMessage(event);
}

export function subscribeAuthEvents(onEvent: (event: AuthChannelEvent) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const handleMessage = (e: MessageEvent): void => {
    if (isAuthChannelEvent(e.data)) onEvent(e.data);
  };
  ch.addEventListener('message', handleMessage);
  return () => ch.removeEventListener('message', handleMessage);
}
