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
}

// --- Health ---

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  memory: { used: number; total: number };
  services: Record<string, string>;
}
