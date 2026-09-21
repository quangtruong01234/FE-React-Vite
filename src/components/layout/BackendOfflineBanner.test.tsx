import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setBackendStatus, BACKEND_WINDOW_LABEL } from '@/lib/demo/backendStatus';
import { BackendOfflineBanner } from './BackendOfflineBanner';

afterEach(() => setBackendStatus('online'));

describe('BackendOfflineBanner', () => {
  it('renders nothing while the backend is online', () => {
    setBackendStatus('online');
    const { container } = render(<BackendOfflineBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it('explains the schedule when the backend is offline', () => {
    setBackendStatus('offline');
    render(<BackendOfflineBanner />);

    expect(screen.getByRole('status')).toHaveTextContent(BACKEND_WINDOW_LABEL);
  });

  it('points at the demo guide', () => {
    setBackendStatus('offline');
    render(<BackendOfflineBanner />);

    expect(screen.getByRole('link', { name: 'Demo guide' })).toHaveAttribute(
      'href',
      expect.stringContaining('DEMO.md'),
    );
  });
});
