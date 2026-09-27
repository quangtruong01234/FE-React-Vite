import { describe, it, expect, vi } from 'vitest';
import { bootstrapBackendStatus, whenBackendBootstrapped } from './bootstrap';

vi.mock('./probeBackend', () => ({ probeBackend: () => Promise.resolve('online') }));

describe('whenBackendBootstrapped', () => {
  it('stays pending until bootstrapBackendStatus settles, then resolves', async () => {
    let settled = false;
    const ready = whenBackendBootstrapped().then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await expect(bootstrapBackendStatus()).resolves.toBe('online');
    await ready;
    expect(settled).toBe(true);
  });
});
