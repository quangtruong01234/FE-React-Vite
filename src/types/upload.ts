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
}
