import { useEffect, useImperativeHandle, useRef, useState, type ReactElement, type Ref } from 'react';
import { useTheme } from '@/context/useTheme';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { authMessages } from './auth.i18n';
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

type CaptchaStatus = 'waiting' | 'ready' | 'failed';

// Managed challenge shown only when Cloudflare needs an interaction — most
// visitors never see it and get a token in the background. The form's submit
// waits for that token (F32), so the widget says why while there is none.
export function TurnstileWidget({ siteKey, onToken, ref }: TurnstileWidgetProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [status, setStatus] = useState<CaptchaStatus>('waiting');
  // Bumped by "Thử lại" to load the script / render the widget from scratch.
  const [attempt, setAttempt] = useState(0);
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const t = useT(authMessages);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      setStatus('waiting');
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
          callback: (token) => {
            setStatus('ready');
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            setStatus('waiting');
            onTokenRef.current(null);
          },
          'error-callback': () => {
            setStatus('failed');
            onTokenRef.current(null);
          },
          theme,
          language: lang,
          appearance: 'interaction-only',
        });
      })
      .catch(() => {
        // Script blocked or Cloudflare down. The backend refuses a missing
        // token, so say so and offer a retry rather than a dead button.
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
      if (apiRef.current && widgetIdRef.current) apiRef.current.remove(widgetIdRef.current);
      widgetIdRef.current = null;
      setStatus('waiting');
      onTokenRef.current(null);
    };
  }, [siteKey, theme, lang, attempt]);

  function retry(): void {
    setStatus('waiting');
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div ref={containerRef} className="flex justify-center empty:hidden" />
      {status === 'waiting' && (
        <p role="status" className="m-0 font-body text-[12px] text-tb-muted">
          {t('captchaWaiting')}
        </p>
      )}
      {status === 'failed' && (
        <p role="alert" className="m-0 font-body text-[12px] text-tb-red text-center">
          {t('captchaLoadFailed')}{' '}
          <button
            type="button"
            onClick={retry}
            className="bg-transparent !border-none p-0 rounded-none text-tb-amber font-semibold text-[12px] cursor-pointer"
          >
            {t('captchaRetry')}
          </button>
        </p>
      )}
    </div>
  );
}
