import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthChannelEvent } from './authChannel';

// Minimal in-memory BroadcastChannel mimicking the spec detail the module
// relies on: a message is delivered to every same-name channel object EXCEPT
// the one that posted it. A second instance stands in for "another tab".
class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  private listeners = new Set<(e: MessageEvent) => void>();

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: 'message', fn: (e: MessageEvent) => void): void {
    this.listeners.add(fn);
  }

  removeEventListener(_type: 'message', fn: (e: MessageEvent) => void): void {
    this.listeners.delete(fn);
  }

  postMessage(data: unknown): void {
    for (const other of FakeBroadcastChannel.instances) {
      if (other === this || other.name !== this.name) continue;
      other.listeners.forEach(fn => fn({ data } as MessageEvent));
    }
  }

  close(): void {
    this.listeners.clear();
  }
}

// The module caches its channel, so each test re-imports a fresh copy.
async function loadAuthChannel(): Promise<typeof import('./authChannel')> {
  return import('./authChannel');
}

function otherTab(): FakeBroadcastChannel {
  return new FakeBroadcastChannel('trybuy-auth');
}

describe('authChannel', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delivers an event posted by another tab to the subscriber', async () => {
    const { subscribeAuthEvents } = await loadAuthChannel();
    const onEvent = vi.fn();
    subscribeAuthEvents(onEvent);

    otherTab().postMessage({ type: 'logout' } satisfies AuthChannelEvent);

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: 'logout' });
  });

  it('does not echo this tab\'s own postAuthEvent back to its subscriber', async () => {
    const { subscribeAuthEvents, postAuthEvent } = await loadAuthChannel();
    const onEvent = vi.fn();
    subscribeAuthEvents(onEvent);

    postAuthEvent({ type: 'login' });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('reaches another tab when posting via postAuthEvent', async () => {
    const { postAuthEvent } = await loadAuthChannel();
    const received: unknown[] = [];
    const tab = otherTab();
    tab.addEventListener('message', e => received.push(e.data));

    postAuthEvent({ type: 'logout' });

    expect(received).toEqual([{ type: 'logout' }]);
  });

  it('ignores malformed payloads', async () => {
    const { subscribeAuthEvents } = await loadAuthChannel();
    const onEvent = vi.fn();
    subscribeAuthEvents(onEvent);
    const tab = otherTab();

    tab.postMessage('logout');
    tab.postMessage(null);
    tab.postMessage({ type: 'reset-password' });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', async () => {
    const { subscribeAuthEvents } = await loadAuthChannel();
    const onEvent = vi.fn();
    const unsubscribe = subscribeAuthEvents(onEvent);

    unsubscribe();
    otherTab().postMessage({ type: 'logout' } satisfies AuthChannelEvent);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('is a safe no-op when BroadcastChannel is unavailable', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('BroadcastChannel', undefined);
    const { subscribeAuthEvents, postAuthEvent } = await loadAuthChannel();

    expect(() => postAuthEvent({ type: 'logout' })).not.toThrow();
    const unsubscribe = subscribeAuthEvents(vi.fn());
    expect(() => unsubscribe()).not.toThrow();
  });

  it('isAuthChannelEvent narrows only login/logout objects', async () => {
    const { isAuthChannelEvent } = await loadAuthChannel();

    expect(isAuthChannelEvent({ type: 'login' })).toBe(true);
    expect(isAuthChannelEvent({ type: 'logout' })).toBe(true);
    expect(isAuthChannelEvent({ type: 'other' })).toBe(false);
    expect(isAuthChannelEvent('logout')).toBe(false);
    expect(isAuthChannelEvent(null)).toBe(false);
  });
});
