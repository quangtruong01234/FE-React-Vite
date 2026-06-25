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

  it('rethrows non-404 errors instead of fanning out', async () => {
    const serverError: ApiError = { statusCode: 500, status: 500, message: 'boom' };
    const fetchBatch = vi.fn().mockRejectedValue(serverError);
    const fetchOne = vi.fn();

    await expect(fetchBatchTolerant([1], fetchBatch, fetchOne)).rejects.toBe(serverError);
    expect(fetchOne).not.toHaveBeenCalled();
  });
});
