import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { TurnstileWidget, type TurnstileHandle } from './TurnstileWidget';
import { TURNSTILE_SCRIPT_URL, type TurnstileApi, type TurnstileRenderOptions } from './captcha';

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
  document.head.querySelectorAll('script').forEach((script) => script.remove());
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

  // F32: the form's submit is disabled until a token arrives — say why.
  it('shows a waiting hint until a token arrives', async () => {
    const api = installFakeTurnstile();
    renderWidget(vi.fn());
    await waitFor(() => expect(api.render).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('Đang xác minh');

    act(() => api.options().callback('tok-1'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => api.options()['expired-callback']());
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('on a challenge error shows a retry that renders the widget again', async () => {
    const api = installFakeTurnstile();
    const onToken = vi.fn();
    renderWidget(onToken);
    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(1));

    act(() => api.options()['error-callback']());
    expect(onToken).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được bước xác minh');

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(2));
    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Under enforce a missing token is a guaranteed 400, so a blocked script
  // must not leave a silently dead button.
  it('when the script fails to load, retry injects it again', async () => {
    renderWidget(vi.fn());
    const script = (): HTMLScriptElement | null =>
      document.head.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_URL}"]`);
    await waitFor(() => expect(script()).not.toBeNull());

    act(() => {
      script()?.dispatchEvent(new Event('error'));
    });
    await screen.findByRole('alert');

    const api = installFakeTurnstile();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(api.render).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
