import { http, HttpResponse } from 'msw';

/**
 * Base URL mirrors `api/index.ts` (`VITE_API_URL ?? 'http://localhost:3000/api'`).
 * Tests run without `VITE_API_URL`, so the fallback applies.
 */
export const API_BASE = 'http://localhost:3000/api';

/**
 * Default handlers shared by the whole suite. Keep this minimal — per-test
 * overrides belong in the test via `server.use(...)`. The `request()` helper
 * unwraps a `{ data }` envelope, so handlers return `{ data: ... }` where that
 * matches the real backend.
 */
export const handlers = [
  http.get(`${API_BASE}/cart`, () => HttpResponse.json({ data: null })),
];
