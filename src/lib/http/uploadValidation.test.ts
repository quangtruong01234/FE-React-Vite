import { describe, it, expect } from 'vitest';
import {
  validateUploadFile,
  firstUploadError,
  capFilesToLimit,
  capImageBatch,
  resolveUploadCap,
  oversizeMessage,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_PRODUCT_IMAGES,
  type FileLike,
} from './uploadValidation';

const img = (over: Partial<FileLike> = {}): FileLike => ({
  type: 'image/png',
  size: 1024,
  name: 'photo.png',
  ...over,
});

const vid = (over: Partial<FileLike> = {}): FileLike => ({
  type: 'video/mp4',
  size: 1024,
  name: 'clip.mp4',
  ...over,
});

describe('validateUploadFile — image', () => {
  const opts = { kind: 'image' as const, maxBytes: MAX_IMAGE_BYTES };

  it('accepts a normal image', () => {
    expect(validateUploadFile(img(), opts)).toBeNull();
  });

  it('rejects SVG by MIME (backend rejects it as a script vector)', () => {
    expect(validateUploadFile(img({ type: 'image/svg+xml', name: 'a.svg' }), opts))
      .toBe('Không hỗ trợ ảnh SVG');
  });

  it('rejects SVG by extension when MIME is empty', () => {
    expect(validateUploadFile(img({ type: '', name: 'a.svg' }), opts))
      .toBe('Không hỗ trợ ảnh SVG');
  });

  it('rejects a non-image MIME type', () => {
    expect(validateUploadFile(img({ type: 'application/pdf', name: 'doc.pdf' }), opts))
      .toBe('Ảnh không đúng định dạng');
  });

  it('rejects a video selected where an image is expected', () => {
    expect(validateUploadFile(img({ type: 'video/mp4', name: 'clip.mp4' }), opts))
      .toBe('Ảnh không đúng định dạng');
  });

  it('rejects an oversize image', () => {
    expect(validateUploadFile(img({ size: MAX_IMAGE_BYTES + 1 }), opts))
      .toBe('Ảnh vượt quá 10MB');
  });

  it('falls back to extension when MIME is empty (paste/drag)', () => {
    expect(validateUploadFile(img({ type: '', name: 'photo.webp' }), opts)).toBeNull();
    expect(validateUploadFile(img({ type: '', name: 'notes.txt' }), opts))
      .toBe('Ảnh không đúng định dạng');
  });

  it('rejects when neither MIME nor a usable extension is present', () => {
    expect(validateUploadFile(img({ type: '', name: undefined }), opts))
      .toBe('Ảnh không đúng định dạng');
  });
});

describe('validateUploadFile — video', () => {
  const opts = { kind: 'video' as const, maxBytes: MAX_VIDEO_BYTES };

  it('accepts a normal video', () => {
    expect(validateUploadFile(vid(), opts)).toBeNull();
  });

  it('rejects a non-video MIME type', () => {
    expect(validateUploadFile(vid({ type: 'image/png', name: 'a.png' }), opts))
      .toBe('Video không đúng định dạng');
  });

  it('rejects an oversize video', () => {
    expect(validateUploadFile(vid({ size: MAX_VIDEO_BYTES + 1 }), opts))
      .toBe('Video vượt quá 100MB');
  });
});

describe('firstUploadError', () => {
  const opts = { kind: 'image' as const, maxBytes: MAX_IMAGE_BYTES };

  it('returns null when every file passes', () => {
    expect(firstUploadError([img(), img({ name: 'b.jpg', type: 'image/jpeg' })], opts)).toBeNull();
  });

  it('returns the first failing file’s message', () => {
    const files = [img(), img({ size: MAX_IMAGE_BYTES + 1 }), img({ type: 'application/pdf' })];
    expect(firstUploadError(files, opts)).toBe('Ảnh vượt quá 10MB');
  });

  it('returns null for an empty batch', () => {
    expect(firstUploadError([], opts)).toBeNull();
  });
});

describe('capFilesToLimit', () => {
  const files = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

  it('accepts the whole batch when it fits under the limit', () => {
    expect(capFilesToLimit(2, files(3), 10)).toEqual({ accepted: [0, 1, 2], dropped: 0 });
  });

  it('accepts exactly up to the limit and drops the rest', () => {
    // 8 already held, 5 incoming, cap 10 → only 2 fit, 3 dropped.
    const { accepted, dropped } = capFilesToLimit(8, files(5), 10);
    expect(accepted).toEqual([0, 1]);
    expect(dropped).toBe(3);
  });

  it('accepts nothing and drops all when already at the limit', () => {
    expect(capFilesToLimit(10, files(3), 10)).toEqual({ accepted: [], dropped: 3 });
  });

  it('never returns negative counts when already over the limit', () => {
    expect(capFilesToLimit(12, files(2), 10)).toEqual({ accepted: [], dropped: 2 });
  });

  it('uses MAX_PRODUCT_IMAGES = 10 to match the backend cap', () => {
    expect(MAX_PRODUCT_IMAGES).toBe(10);
    expect(capFilesToLimit(0, files(11), MAX_PRODUCT_IMAGES).accepted).toHaveLength(10);
    expect(capFilesToLimit(0, files(11), MAX_PRODUCT_IMAGES).dropped).toBe(1);
  });
});

describe('capImageBatch', () => {
  const files = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

  it('returns no notice when the whole batch fits', () => {
    expect(capImageBatch(1, files(3), 4)).toEqual({ accepted: [0, 1, 2], notice: null });
  });

  it('UP-07: reports a partial drop instead of slicing silently', () => {
    const { accepted, notice } = capImageBatch(2, files(5), 4);
    expect(accepted).toEqual([0, 1]);
    expect(notice).toBe('Chỉ thêm được 2/5 ảnh — tối đa 4 ảnh');
  });

  it('reports the cap when nothing fits', () => {
    const { accepted, notice } = capImageBatch(4, files(2), 4);
    expect(accepted).toEqual([]);
    expect(notice).toBe('Tối đa 4 ảnh');
  });

  it('returns no notice for an empty incoming batch', () => {
    expect(capImageBatch(4, files(0), 4)).toEqual({ accepted: [], notice: null });
  });
});

describe('resolveUploadCap — UPLOAD-SIZE-01', () => {
  it('prefers the backend ceiling over the local constant for images', () => {
    expect(resolveUploadCap({ maxBytes: 5 * 1024 * 1024 }, 'image')).toBe(5 * 1024 * 1024);
  });

  it('prefers the backend video ceiling for videos', () => {
    expect(resolveUploadCap({ maxBytes: 10, maxVideoBytes: 42 }, 'video')).toBe(42);
  });

  it('falls back to the local constants on a backend that does not report caps', () => {
    expect(resolveUploadCap(undefined, 'image')).toBe(MAX_IMAGE_BYTES);
    expect(resolveUploadCap(undefined, 'video')).toBe(MAX_VIDEO_BYTES);
    expect(resolveUploadCap({}, 'image')).toBe(MAX_IMAGE_BYTES);
  });

  it('falls back to the video constant when only the image cap comes back (non-video folder)', () => {
    expect(resolveUploadCap({ maxBytes: 5 }, 'video')).toBe(MAX_VIDEO_BYTES);
  });

  it('does not confuse a video-folder image with a video: the image cap still applies', () => {
    // `trybuy/posts` reports both; an image there must be measured against maxBytes.
    expect(resolveUploadCap({ maxBytes: 10 * 1024 * 1024, maxVideoBytes: 100 * 1024 * 1024 }, 'image'))
      .toBe(10 * 1024 * 1024);
  });
});

describe('oversizeMessage', () => {
  it('matches the message validateUploadFile produces, so both guards read alike', () => {
    const tooBig = img({ size: MAX_IMAGE_BYTES + 1 });
    expect(validateUploadFile(tooBig, { kind: 'image', maxBytes: MAX_IMAGE_BYTES }))
      .toBe(oversizeMessage('image', MAX_IMAGE_BYTES));
    expect(oversizeMessage('image', MAX_IMAGE_BYTES)).toBe('Ảnh vượt quá 10MB');
    expect(oversizeMessage('video', MAX_VIDEO_BYTES)).toBe('Video vượt quá 100MB');
  });
});
