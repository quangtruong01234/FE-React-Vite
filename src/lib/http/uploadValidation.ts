export type UploadKind = 'image' | 'video';

/** Minimal shape of a `File` this validator needs — lets tests pass plain stubs. */
export interface FileLike {
  type: string;
  size: number;
  name?: string;
}

export interface ValidateUploadOptions {
  kind: UploadKind;
  /** Max allowed size in bytes. */
  maxBytes: number;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

/** The size ceilings the signature endpoint reports (UPLOAD-SIZE-01). */
export interface UploadCaps {
  maxBytes?: number;
  maxVideoBytes?: number;
}

/**
 * UPLOAD-SIZE-01: the backend owns the size ceiling now and returns it on the
 * upload signature, so the cap is read from the response rather than hardcoded —
 * lower it server-side and this client respects it without a deploy. The
 * constants above stay as the fallback: they are the fast pre-upload guard the
 * pickers run *before* any signature exists, and they are what a backend that
 * predates the change leaves us with. Today both sides carry the same numbers,
 * so nothing changes until the backend moves one.
 *
 * A video cap only exists for the folder that accepts video; anything else falls
 * back to the image ceiling.
 */
export function resolveUploadCap(caps: UploadCaps | undefined, kind: UploadKind): number {
  if (kind === 'video') return caps?.maxVideoBytes ?? MAX_VIDEO_BYTES;
  return caps?.maxBytes ?? MAX_IMAGE_BYTES;
}

/** The oversize message, shared by the pre-upload guard and the post-signature check. */
export function oversizeMessage(kind: UploadKind, maxBytes: number): string {
  return `${kind === 'image' ? 'Ảnh' : 'Video'} vượt quá ${formatMb(maxBytes)}MB`;
}

// Backend caps `imageUrls[]` at 10 entries on products and posts → 11+ is a 400
// (backend-handoff 2026-07-07). Enforce it client-side so the UI never submits an
// over-limit batch and the user gets a clear message instead of a server error.
export const MAX_PRODUCT_IMAGES = 10;

export interface FileCapResult<T> {
  /** The prefix of `files` that fits within the remaining slots. */
  accepted: T[];
  /** How many trailing files were dropped because the limit was reached. */
  dropped: number;
}

/**
 * Cap an incoming batch so `currentCount + accepted.length` never exceeds `max`.
 * Returns the accepted prefix plus the count that had to be dropped, so callers
 * can both upload what fits and tell the user how many were skipped.
 */
export function capFilesToLimit<T>(currentCount: number, files: T[], max: number): FileCapResult<T> {
  const available = Math.max(0, max - currentCount);
  return {
    accepted: files.slice(0, available),
    dropped: Math.max(0, files.length - available),
  };
}

export interface ImageBatchCap<T> {
  accepted: T[];
  /** User-facing notice when files were dropped over the cap; null when all fit. */
  notice: string | null;
}

/**
 * UP-07: cap an image batch AND produce the message telling the user what was
 * dropped — a silent slice leaves them wondering where their files went.
 */
export function capImageBatch<T>(currentCount: number, files: T[], max: number): ImageBatchCap<T> {
  const { accepted, dropped } = capFilesToLimit(currentCount, files, max);
  if (dropped === 0) return { accepted, notice: null };
  if (accepted.length === 0) return { accepted, notice: `Tối đa ${max} ảnh` };
  return {
    accepted,
    notice: `Chỉ thêm được ${accepted.length}/${files.length} ảnh — tối đa ${max} ảnh`,
  };
}

// Mirrors the backend Cloudinary allow-list (backend-handoff 2026-07-07).
// SVG is deliberately excluded — the backend rejects it as a script vector.
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'];

function extensionOf(name: string | undefined): string | null {
  if (!name) return null;
  const dot = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

function formatMb(bytes: number): string {
  return String(Math.round(bytes / (1024 * 1024)));
}

/**
 * UP-04: reject a file client-side before spending bandwidth on an upload the
 * backend would refuse anyway. `accept="image/*"` on the picker is only a hint —
 * a user can still choose a 500 MB file or a non-media file. Checks, in order:
 *   1. SVG images (rejected server-side as a script vector),
 *   2. type mismatch (MIME prefix, falling back to extension when the browser
 *      omits the MIME type),
 *   3. oversize.
 * Returns a Vietnamese error message, or `null` when the file is acceptable.
 */
export function validateUploadFile(
  file: FileLike,
  { kind, maxBytes }: ValidateUploadOptions,
): string | null {
  const label = kind === 'image' ? 'Ảnh' : 'Video';
  const allowed = kind === 'image' ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
  const ext = extensionOf(file.name);
  const mime = (file.type ?? '').toLowerCase();

  if (kind === 'image' && (mime === 'image/svg+xml' || ext === 'svg')) {
    return 'Không hỗ trợ ảnh SVG';
  }

  // Prefer the MIME prefix; fall back to the extension when the browser gives no
  // MIME type (some drag/paste sources leave `type` empty).
  if (mime) {
    if (!mime.startsWith(`${kind}/`)) return `${label} không đúng định dạng`;
  } else if (!(ext != null && allowed.includes(ext))) {
    return `${label} không đúng định dạng`;
  }

  if (file.size > maxBytes) {
    return oversizeMessage(kind, maxBytes);
  }

  return null;
}

/** Validate a batch; returns the first error found, or `null` if all pass. */
export function firstUploadError(
  files: FileLike[],
  opts: ValidateUploadOptions,
): string | null {
  for (const file of files) {
    const err = validateUploadFile(file, opts);
    if (err) return err;
  }
  return null;
}
