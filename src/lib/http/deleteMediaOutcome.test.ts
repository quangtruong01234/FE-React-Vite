import { describe, it, expect } from 'vitest';
import type { ApiError } from '@/types';
import { outcomeFromResult, outcomeFromError } from './deleteMediaOutcome';

function apiError(statusCode: number): ApiError {
  return { statusCode, status: statusCode, message: `err ${statusCode}` };
}

describe('outcomeFromResult', () => {
  it('maps "ok" to deleted', () => {
    expect(outcomeFromResult('ok')).toEqual({ status: 'deleted' });
  });

  it('maps "not found" to not-found (distinct from a transient failure)', () => {
    expect(outcomeFromResult('not found')).toEqual({ status: 'not-found' });
  });

  it('treats any other 200 result string as deleted', () => {
    expect(outcomeFromResult('deleted')).toEqual({ status: 'deleted' });
  });
});

describe('outcomeFromError', () => {
  it('classifies 502 (Cloudinary auth/quota/5xx) as a transient failure', () => {
    expect(outcomeFromError(apiError(502))).toEqual({ status: 'failed', transient: true });
  });

  it('classifies 503 (network) as a transient failure', () => {
    expect(outcomeFromError(apiError(503))).toEqual({ status: 'failed', transient: true });
  });

  it('classifies 403 (foreign id) as a permanent failure — leave orphan', () => {
    expect(outcomeFromError(apiError(403))).toEqual({ status: 'failed', transient: false });
  });

  it('classifies 400 (persisted/bad id) as a permanent failure', () => {
    expect(outcomeFromError(apiError(400))).toEqual({ status: 'failed', transient: false });
  });

  it('classifies a non-ApiError throwable as a permanent failure', () => {
    expect(outcomeFromError(new Error('network down'))).toEqual({ status: 'failed', transient: false });
    expect(outcomeFromError(undefined)).toEqual({ status: 'failed', transient: false });
  });
});
