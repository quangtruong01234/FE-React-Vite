import { useEffect, useImperativeHandle, useRef, type ReactElement, type Ref } from 'react';
import { useTheme } from '@/context/useTheme';
import { useLanguage } from '@/context/useLanguage';
import { loadTurnstile, type TurnstileApi } from './captcha';

export interface TurnstileHandle {
  /** Turnstile tokens are single-use: call after every submit, success or not. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** A fresh token, or null once it expires / errors / is reset. */
  onToken: (token: string | null) => void;
  ref?: Ref<TurnstileHandle>;
}

// Managed challenge shown only when Cloudflare needs an interaction — most
// visitors never see it and get a token in the background.
export function TurnstileWidget({ siteKey, onToken, ref }: TurnstileWidgetProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const { theme } = useTheme();
  const { lang } = useLanguage();

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (apiRef.current && widgetIdRef.current) apiRef.current.reset(widgetIdRef.current);
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    void loadTurnstile()
      .then((api) => {
        const container = containerRef.current;
        if (cancelled || !container) return;
        apiRef.current = api;
        widgetIdRef.current = api.render(container, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          theme,
          language: lang,
          appearance: 'interaction-only',
        });
      })
      .catch(() => {
        // Script blocked or Cloudflare down: submit without a token — the
        // backend fails open in that case.
      });
    return () => {
      cancelled = true;
      if (apiRef.current && widgetIdRef.current) apiRef.current.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      onTokenRef.current(null);
    };
  }, [siteKey, theme, lang]);

  return <div ref={containerRef} className="flex justify-center empty:hidden" />;
}
