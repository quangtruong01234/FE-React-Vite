// --- Upload ---

export interface UploadSignature {
  signature: string;
  timestamp: number;
  cloud_name: string;
  api_key: string;
  folder: string;
  public_id: string;
  /** Signed by the backend (SEC-M8) — must be sent to Cloudinary verbatim when present. */
  allowed_formats?: string;
  /**
   * UPLOAD-SIZE-01: the backend's own size ceilings, camelCase because they are
   * ours and must NOT be forwarded to Cloudinary (`signedUploadFields` drops
   * them). Optional — absent on a backend that predates the change, which is why
   * every reader falls back to the local constant. `maxVideoBytes` only comes
   * back for `trybuy/posts`, the one folder whose formats include `mp4`.
   */
  maxBytes?: number;
  maxVideoBytes?: number;
}
