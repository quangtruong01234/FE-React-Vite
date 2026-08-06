import { describe, it, expect } from 'vitest';
import { overloadRetryDelayMs, MAX_RETRY_DELAY_MS, DEFAULT_RETRY_AFTER_SECONDS } from './retry';

describe('overloadRetryDelayMs (SCALE-05)', () => {
  it('returns null for non-503 statuses (no retry)', () => {
    expect(overloadRetryDelayMs(200, '2')).toBeNull();
    expect(overloadRetryDelayMs(429, '2')).toBeNull();
    expect(overloadRetryDelayMs(500, '2')).toBeNull();
    expect(overloadRetryDelayMs(502, '2')).toBeNull();
  });

  it('honours an integer Retry-After header, in ms', () => {
    expect(overloadRetryDelayMs(503, '2')).toBe(2000);
    expect(overloadRetryDelayMs(503, '0')).toBe(0);
    expect(overloadRetryDelayMs(503, '4')).toBe(4000);
  });

  it('falls back to the default delay when Retry-After is missing', () => {
    expect(overloadRetryDelayMs(503, null)).toBe(DEFAULT_RETRY_AFTER_SECONDS * 1000);
    expect(overloadRetryDelayMs(503, '')).toBe(DEFAULT_RETRY_AFTER_SECONDS * 1000);
    expect(overloadRetryDelayMs(503, '   ')).toBe(DEFAULT_RETRY_AFTER_SECONDS * 1000);
  });

  it('falls back to the default for a non-numeric or negative Retry-After (e.g. HTTP-date)', () => {
    expect(overloadRetryDelayMs(503, 'Wed, 21 Oct 2026 07:28:00 GMT')).toBe(DEFAULT_RETRY_AFTER_SECONDS * 1000);
    expect(overloadRetryDelayMs(503, 'soon')).toBe(DEFAULT_RETRY_AFTER_SECONDS * 1000);
    expect(overloadRetryDelayMs(503, '-5')).toBe(DEFAULT_RETRY_AFTER_SECONDS * 1000);
  });

  it('caps a large Retry-After at MAX_RETRY_DELAY_MS so the UI cannot hang', () => {
    expect(overloadRetryDelayMs(503, '3600')).toBe(MAX_RETRY_DELAY_MS);
    expect(overloadRetryDelayMs(503, '6')).toBe(MAX_RETRY_DELAY_MS);
  });
});
