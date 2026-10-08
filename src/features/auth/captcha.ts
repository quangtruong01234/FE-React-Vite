import type { ApiError } from '@/types';

/**
 * Cloudflare Turnstile on register + forgot-password (CAPTCHA-01, backend
 * handoff 2026-09-28). Both routes take an optional `captchaToken`; with
 * `CAPTCHA_ENFORCE` on, a missing / wrong / expired / already-used token is a
 * `400 errorCode: CAPTCHA_REQUIRED`. Tokens are single-use, so the widget is
 * reset after every submit. Login carries no captcha on purpose.
 */

export const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

const CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED';

/** The public site key, or null when unset — then no widget renders and no field is sent. */
export function turnstileSiteKey(raw: string | undefined): string | null {
  const key = raw?.trim();
  return key ? key : null;
}

export const TURNSTILE_SITE_KEY = turnstileSiteKey(
  import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined,
);

export function isCaptchaRequired(error: unknown): boolean {
  return (error as ApiError | undefined)?.errorCode === CAPTCHA_REQUIRED;
}

/**
 * F32: with a site key set, submit waits for a token. The backend enforces
 * since 2026-10-06, and under enforce a missing token is always a 400 — its
 * fail-open only covers Cloudflare's siteverify being down, not a client that
 * never got a token. No key ⇒ no widget ⇒ never blocked.
 */
export function captchaBlocksSubmit(siteKey: string | null, token: string | null): boolean {
  return siteKey !== null && token === null;
}

/** Adds `captchaToken` only when there is one — an absent token stays an absent field. */
export function withCaptchaToken<T extends object>(
  dto: T,
  token: string | null,
): T & { captchaToken?: string } {
  return token ? { ...dto, captchaToken: token } : dto;
}

export interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  theme: 'light' | 'dark';
  language: string;
  appearance: 'always' | 'execute' | 'interaction-only';
}

export interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/**
 * Injects the Turnstile script once and resolves with its API. A failed load
 * clears the cache so a retry (the widget's "Thử lại") injects it again.
 */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile script loaded without window.turnstile'));
    };
    script.onerror = () => reject(new Error('Turnstile script failed to load'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}
