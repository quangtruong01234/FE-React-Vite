import { describe, it, expect, vi } from 'vitest';
import type { ApiError } from '@/types';
import { fetchBatchTolerant } from './fetchBatchTolerant';

const notFound: ApiError = { statusCode: 404, status: 404, message: 'Product not found' };

describe('fetchBatchTolerant', () => {
  it('returns the batch result without fan-out on the happy path', async () => {
    const fetchBatch = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const fetchOne = vi.fn();

    const result = await fetchBatchTolerant([1, 2], fetchBatch, fetchOne);

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchBatch).toHaveBeenCalledOnce();
    expect(fetchOne).not.toHaveBeenCalled();
  });

  it('short-circuits to [] for an empty id list without calling fetchers', async () => {
    const fetchBatch = vi.fn();
    const fetchOne = vi.fn();

    expect(await fetchBatchTolerant([], fetchBatch, fetchOne)).toEqual([]);
    expect(fetchBatch).not.toHaveBeenCalled();
    expect(fetchOne).not.toHaveBeenCalled();
  });

  it('falls back to per-id fetches on 404 and drops the missing ones', async () => {
    const fetchBatch = vi.fn().mockRejectedValue(notFound);
    const fetchOne = vi.fn((id: number) =>
      id === 2 ? Promise.reject(notFound) : Promise.resolve({ id }),
    );

    const result = await fetchBatchTolerant([1, 2, 3], fetchBatch, fetchOne);

    expect(result).toEqual([{ id: 1 }, { id: 3 }]);
    expect(fetchOne).toHaveBeenCalledTimes(3);
  });

  it('fans out when the batch answers [] for ids we actually asked for', async () => {
    // The real prod failure: the gateway flattens a product-service 404 into an
    // empty 200, so one stale cart row would otherwise blank the whole cart.
    const fetchBatch = vi.fn().mockResolvedValue([]);
    const fetchOne = vi.fn((id: number) =>
      id === 2 ? Promise.reject(notFound) : Promise.resolve({ id }),
    );

    const result = await fetchBatchTolerant([1, 2, 3], fetchBatch, fetchOne);

    expect(result).toEqual([{ id: 1 }, { id: 3 }]);
    expect(fetchOne).toHaveBeenCalledTimes(3);
  });

  it('returns [] when the fan-out confirms every id is gone', async () => {
    const fetchBatch = vi.fn().mockResolvedValue([]);
    const fetchOne = vi.fn().mockRejectedValue(notFound);

    expect(await fetchBatchTolerant([1, 2], fetchBatch, fetchOne)).toEqual([]);
    expect(fetchOne).toHaveBeenCalledTimes(2);
  });

  it('trusts a partial batch and does not fan out to top it up', async () => {
    // Post-fix BE returns the survivors; that is a complete answer, not a loss.
    const fetchBatch = vi.fn().mockResolvedValue([{ id: 1 }]);
    const fetchOne = vi.fn();

    expect(await fetchBatchTolerant([1, 2], fetchBatch, fetchOne)).toEqual([{ id: 1 }]);
    expect(fetchOne).not.toHaveBeenCalled();
  });

  it('rethrows non-404 errors instead of fanning out', async () => {
    const serverError: ApiError = { statusCode: 500, status: 500, message: 'boom' };
    const fetchBatch = vi.fn().mockRejectedValue(serverError);
    const fetchOne = vi.fn();

    await expect(fetchBatchTolerant([1], fetchBatch, fetchOne)).rejects.toBe(serverError);
    expect(fetchOne).not.toHaveBeenCalled();
  });
});
