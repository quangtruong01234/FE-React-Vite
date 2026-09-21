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

const JSON_TYPE = 'application/json; charset=utf-8';

describe('classifyProbe', () => {
  it('reads a 2xx as online', () => {
    expect(classifyProbe({ ok: true, contentType: JSON_TYPE })).toBe('online');
  });

  it('reads a non-2xx as offline', () => {
    // A gateway answering 502 is as unusable as one that never answers, and the
    // visitor should land in demo mode rather than on a half-broken page.
    expect(classifyProbe({ ok: false, contentType: JSON_TYPE })).toBe('offline');
  });

  it('reads a failed request as offline', () => {
    expect(classifyProbe(null)).toBe('offline');
  });

  it('reads an HTML 200 as offline', () => {
    // /health lives outside /api, so it only reaches the gateway if both the
    // Worker and the vite proxy forward it. Miss either and the request is
    // served by the SPA fallback, which answers 200 with index.html — on `ok`
    // alone a dead gateway would look live and a real outage would render as a
    // broken login form instead of the demo banner.
    expect(classifyProbe({ ok: true, contentType: 'text/html; charset=utf-8' })).toBe(
      'offline',
    );
  });

  it('reads a 200 with no content-type at all as offline', () => {
    expect(classifyProbe({ ok: true, contentType: null })).toBe('offline');
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
