/**
 * Pure planning for Cloudinary chunked uploads. Extracted from `cloudinary.ts`
 * so the offset/`Content-Range`/progress math is unit-testable without touching
 * `fetch`. `uploadChunked` slices the file per plan and POSTs each chunk.
 */

/** 6 MB — Cloudinary's chunked-upload minimum part size (except the final part). */
export const CHUNK_SIZE = 6 * 1024 * 1024;

export interface UploadChunk {
  /** 0-based chunk index. */
  index: number;
  /** Inclusive byte offset of the first byte in this chunk. */
  start: number;
  /** Exclusive byte offset one past the last byte (use with `File.slice`). */
  end: number;
  /** `Content-Range` header value for this chunk. */
  contentRange: string;
  /** Cumulative upload progress after this chunk completes, 0–100 (rounded). */
  percent: number;
}

/**
 * Split a file of `fileSize` bytes into ordered upload chunks. Every chunk but
 * the last is exactly `chunkSize` bytes; the last carries the remainder. A
 * zero-byte file yields no chunks (the caller treats "no URL returned" as an
 * error, matching the previous inline behavior).
 */
export function planUploadChunks(fileSize: number, chunkSize: number = CHUNK_SIZE): UploadChunk[] {
  if (fileSize <= 0 || chunkSize <= 0) return [];

  const totalChunks = Math.ceil(fileSize / chunkSize);
  const chunks: UploadChunk[] = [];

  for (let index = 0; index < totalChunks; index++) {
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    chunks.push({
      index,
      start,
      end,
      contentRange: `bytes ${start}-${end - 1}/${fileSize}`,
      percent: Math.round(((index + 1) / totalChunks) * 100),
    });
  }

  return chunks;
}

/** The `X-Unique-Upload-Id` value that ties a file's chunks together. */
export function buildUploadId(timestamp: number, publicId: string): string {
  return `${timestamp}_${publicId}`;
}
