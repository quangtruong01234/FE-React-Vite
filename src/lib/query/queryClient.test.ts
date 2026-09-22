import { describe, it, expect, afterEach } from 'vitest';
import { retryQuery } from './queryClient';
import { setBackendStatus } from '@/lib/demo/backendStatus';

afterEach(() => setBackendStatus('online'));

describe('retryQuery (DEMO-RETRY-01)', () => {
  it('retries once when the backend is online', () => {
    expect(retryQuery(0)).toBe(true);
    expect(retryQuery(1)).toBe(false);
  });

  it('does not retry in demo mode — the 503 is the final answer', () => {
    setBackendStatus('offline');

    expect(retryQuery(0)).toBe(false);
  });

  it('reads the status at call time, not at module load', () => {
    // `queryClient.ts` is imported long before `bootstrapBackendStatus()`
    // resolves the probe, so a value captured at import would always say
    // "online" and the retry would survive into demo mode.
    expect(retryQuery(0)).toBe(true);

    setBackendStatus('offline');

    expect(retryQuery(0)).toBe(false);
  });
});
