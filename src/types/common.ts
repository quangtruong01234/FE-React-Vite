// --- Common / cross-cutting ---

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ApiError {
  statusCode: number;
  status: number;
  message: string;
  /**
   * Stable machine-readable cause, present only where the backend deliberately
   * attaches one (CHG-PW-02, MAIL-UI-01). The key is ABSENT — not `null` — on
   * every other error, and never present on a 5xx (the gateway's sanitizer
   * strips those). Always read it as `err.errorCode === '...'`; never assume a
   * value exists, and never `switch` on it without a default.
   *
   * Why it matters: on production the gateway flattens `message` to the bare
   * HTTP error name for 401/5xx, so `message` cannot tell two failures apart
   * there even when it can locally. `errorCode` is the only discriminator that
   * reads the same in both environments.
   */
  errorCode?: string;
}

// --- Health ---

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  memory: { used: number; total: number };
  services: Record<string, string>;
}
