import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { TurnstileWidget, type TurnstileHandle } from './TurnstileWidget';
import type { TurnstileApi, TurnstileRenderOptions } from './captcha';

function installFakeTurnstile(): TurnstileApi & { options: () => TurnstileRenderOptions } {
  let last: TurnstileRenderOptions | undefined;
  const api = {
    render: vi.fn((_el: HTMLElement, opts: TurnstileRenderOptions) => {
      last = opts;
      return 'widget-1';
    }),
    reset: vi.fn(),
    remove: vi.fn(),
    options: (): TurnstileRenderOptions => {
      if (!last) throw new Error('widget not rendered');
      return last;
    },
  };
  window.turnstile = api;
  return api;
}

afterEach(() => {
  delete window.turnstile;
});

function renderWidget(onToken: (token: string | null) => void) {
  const ref = createRef<TurnstileHandle>();
  const view = render(
    <ThemeProvider>
      <TurnstileWidget ref={ref} siteKey="site-key" onToken={onToken} />
    </ThemeProvider>,
  );
  return { ref, ...view };
}

describe('TurnstileWidget', () => {
  it('renders the challenge with the site key and passes tokens up', async () => {
    const api = installFakeTurnstile();
    const onToken = vi.fn();
    renderWidget(onToken);

    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(1));
    expect(api.options()).toMatchObject({ sitekey: 'site-key', appearance: 'interaction-only' });

    act(() => api.options().callback('tok-1'));
    expect(onToken).toHaveBeenLastCalledWith('tok-1');

    act(() => api.options()['expired-callback']());
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  // Tokens are single-use: after a submit the parent must not resend the old one.
  it('reset() clears the token and asks Turnstile for a new one', async () => {
    const api = installFakeTurnstile();
    const onToken = vi.fn();
    const { ref } = renderWidget(onToken);
    await waitFor(() => expect(api.render).toHaveBeenCalled());
    act(() => api.options().callback('tok-1'));

    act(() => ref.current?.reset());

    expect(api.reset).toHaveBeenCalledWith('widget-1');
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it('removes the widget on unmount', async () => {
    const api = installFakeTurnstile();
    const { unmount } = renderWidget(vi.fn());
    await waitFor(() => expect(api.render).toHaveBeenCalled());

    unmount();

    expect(api.remove).toHaveBeenCalledWith('widget-1');
  });
});
