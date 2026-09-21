import { describe, it, expect, afterEach } from 'vitest';
import {
  BACKEND_OFFLINE_NOTICE,
  BACKEND_WINDOW_LABEL,
  classifyProbe,
  getBackendStatus,
  isDemoMode,
  setBackendStatus,
} from './backendStatus';

afterEach(() => setBackendStatus('online'));

describe('classifyProbe', () => {
  it('reads a 2xx as online', () => {
    expect(classifyProbe({ ok: true })).toBe('online');
  });

  it('reads a non-2xx as offline', () => {
    // A gateway answering 502 is as unusable as one that never answers, and the
    // visitor should land in demo mode rather than on a half-broken page.
    expect(classifyProbe({ ok: false })).toBe('offline');
  });

  it('reads a failed request as offline', () => {
    expect(classifyProbe(null)).toBe('offline');
  });
});

describe('backend status', () => {
  it('starts online, so a probe that never ran never shows the banner', () => {
    expect(getBackendStatus()).toBe('online');
    expect(isDemoMode()).toBe(false);
  });

  it('turns demo mode on once the status flips to offline', () => {
    setBackendStatus('offline');
    expect(isDemoMode()).toBe(true);
  });
});

describe('notice copy', () => {
  it('names the schedule window, which is the whole point of the message', () => {
    expect(BACKEND_OFFLINE_NOTICE).toContain(BACKEND_WINDOW_LABEL);
  });
});
