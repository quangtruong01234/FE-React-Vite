import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setBackendStatus, DEMO_DISABLED_LABEL } from '@/lib/demo/backendStatus';
import { DemoModeGate } from './DemoModeGate';

afterEach(() => setBackendStatus('online'));

describe('DemoModeGate', () => {
  it('leaves the control alone while the backend is online', async () => {
    setBackendStatus('online');
    const onClick = vi.fn();
    render(
      <DemoModeGate>
        <button onClick={onClick}>Thêm vào giỏ</button>
      </DemoModeGate>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Thêm vào giỏ' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByText(DEMO_DISABLED_LABEL)).not.toBeInTheDocument();
  });

  it('swallows the click in demo mode instead of firing a request that 503s', async () => {
    setBackendStatus('offline');
    const onClick = vi.fn();
    render(
      <DemoModeGate>
        <button onClick={onClick}>Thêm vào giỏ</button>
      </DemoModeGate>,
    );

    // The overlay covers the control, so this is what a real click lands on.
    await userEvent.click(screen.getByRole('button', { name: DEMO_DISABLED_LABEL }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('offers the explanation to keyboard users, not just on hover', () => {
    setBackendStatus('offline');
    render(
      <DemoModeGate>
        <button>Thêm vào giỏ</button>
      </DemoModeGate>,
    );

    expect(screen.getByRole('button', { name: DEMO_DISABLED_LABEL })).toBeInTheDocument();
    expect(screen.getByRole('tooltip')).toHaveTextContent(DEMO_DISABLED_LABEL);
  });
});
