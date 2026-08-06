import { describe, expect, it } from 'vitest';
import { buildUploadId, CHUNK_SIZE, planUploadChunks } from './uploadChunkPlan';

describe('planUploadChunks', () => {
  it('yields a single chunk for a file smaller than the chunk size', () => {
    const chunks = planUploadChunks(1024);
    expect(chunks).toEqual([
      { index: 0, start: 0, end: 1024, contentRange: 'bytes 0-1023/1024', percent: 100 },
    ]);
  });

  it('sizes every chunk but the last at exactly CHUNK_SIZE and covers the remainder', () => {
    const fileSize = CHUNK_SIZE * 2 + 100; // 3 chunks: 6MB, 6MB, 100B
    const chunks = planUploadChunks(fileSize);

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({ start: 0, end: CHUNK_SIZE });
    expect(chunks[1]).toMatchObject({ start: CHUNK_SIZE, end: CHUNK_SIZE * 2 });
    expect(chunks[2]).toMatchObject({ start: CHUNK_SIZE * 2, end: fileSize });
    // last chunk ends exactly at the file size (no overshoot)
    expect(chunks[chunks.length - 1].end).toBe(fileSize);
  });

  it('produces contiguous, non-overlapping ranges', () => {
    const chunks = planUploadChunks(CHUNK_SIZE * 3 - 5);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start).toBe(chunks[i - 1].end);
    }
  });

  it('emits a valid Content-Range for each chunk (last byte is end - 1)', () => {
    const fileSize = CHUNK_SIZE + 500;
    const chunks = planUploadChunks(fileSize);
    expect(chunks[0].contentRange).toBe(`bytes 0-${CHUNK_SIZE - 1}/${fileSize}`);
    expect(chunks[1].contentRange).toBe(`bytes ${CHUNK_SIZE}-${fileSize - 1}/${fileSize}`);
  });

  it('reports monotonically increasing progress ending at 100', () => {
    const chunks = planUploadChunks(CHUNK_SIZE * 4);
    const percents = chunks.map((c) => c.percent);
    expect(percents).toEqual([25, 50, 75, 100]);
  });

  it('handles an exact multiple of the chunk size without an empty trailing chunk', () => {
    const chunks = planUploadChunks(CHUNK_SIZE * 2);
    expect(chunks).toHaveLength(2);
    expect(chunks[1].end).toBe(CHUNK_SIZE * 2);
  });

  it('returns no chunks for a zero-byte or invalid file', () => {
    expect(planUploadChunks(0)).toEqual([]);
    expect(planUploadChunks(-10)).toEqual([]);
    expect(planUploadChunks(1024, 0)).toEqual([]);
  });

  it('honors a custom chunk size', () => {
    const chunks = planUploadChunks(250, 100);
    expect(chunks.map((c) => [c.start, c.end])).toEqual([
      [0, 100],
      [100, 200],
      [200, 250],
    ]);
  });
});

describe('buildUploadId', () => {
  it('joins the signature timestamp and public id', () => {
    expect(buildUploadId(1700000000, '23_abc123')).toBe('1700000000_23_abc123');
  });
});
