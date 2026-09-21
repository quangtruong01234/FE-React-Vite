import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { bootstrapBackendStatus } from '@/lib/demo/bootstrap';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

// Awaited on purpose: demo mode's service worker has to be intercepting before
// the first request goes out. See `lib/demo/bootstrap.ts`.
void bootstrapBackendStatus().finally(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
