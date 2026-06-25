import '@testing-library/jest-dom/vitest';
import { afterEach, afterAll, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

// Start the MSW server before the suite. Any request without a matching handler
// throws, so a component that fires an unexpected network call fails loudly.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
