import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TURNSTILE_SCRIPT_URL,
  captchaBlocksSubmit,
  isCaptchaRequired,
  turnstileSiteKey,
  withCaptchaToken,
  type TurnstileApi,
} from './captcha';

function fakeTurnstile(): TurnstileApi {
  return { render: vi.fn(() => 'w1'), reset: vi.fn(), remove: vi.fn() };
}

function injectedScripts(): HTMLScriptElement[] {
  return Array.from(document.head.querySelectorAll<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_URL}"]`));
}

afterEach(() => {
  delete window.turnstile;
  injectedScripts().forEach((s) => s.remove());
});

describe('turnstileSiteKey', () => {
  it('treats an unset or blank env value as "no captcha"', () => {
    expect(turnstileSiteKey(undefined)).toBeNull();
    expect(turnstileSiteKey('')).toBeNull();
    expect(turnstileSiteKey('   ')).toBeNull();
  });

  it('returns the trimmed key when set', () => {
    expect(turnstileSiteKey(' 0x4AAAAAAA ')).toBe('0x4AAAAAAA');
  });
});

describe('isCaptchaRequired', () => {
  it('matches only the CAPTCHA_REQUIRED errorCode', () => {
    expect(isCaptchaRequired({ statusCode: 400, message: 'x', errorCode: 'CAPTCHA_REQUIRED' })).toBe(true);
    expect(isCaptchaRequired({ statusCode: 400, message: 'Captcha verification failed' })).toBe(false);
    expect(isCaptchaRequired(new Error('boom'))).toBe(false);
    expect(isCaptchaRequired(undefined)).toBe(false);
  });
});

// F32: under enforce a missing token is always a 400, so submit waits for one.
describe('captchaBlocksSubmit', () => {
  it('never blocks when no site key is configured', () => {
    expect(captchaBlocksSubmit(null, null)).toBe(false);
  });

  it('blocks while a configured widget has no token yet', () => {
    expect(captchaBlocksSubmit('site-key', null)).toBe(true);
  });

  it('allows submit once a token is present', () => {
    expect(captchaBlocksSubmit('site-key', 'tok-1')).toBe(false);
  });
});

describe('withCaptchaToken', () => {
  it('adds the token when there is one', () => {
    expect(withCaptchaToken({ email: 'a@b.com' }, 'tok')).toEqual({ email: 'a@b.com', captchaToken: 'tok' });
  });

  it('leaves the field out entirely without a token', () => {
    const dto = withCaptchaToken({ email: 'a@b.com' }, null);
    expect(dto).toEqual({ email: 'a@b.com' });
    expect('captchaToken' in dto).toBe(false);
  });
});

// The loader caches its script promise at module scope — load a fresh copy per test.
async function freshLoader(): Promise<typeof import('./captcha').loadTurnstile> {
  vi.resetModules();
  return (await import('./captcha')).loadTurnstile;
}

describe('loadTurnstile', () => {
  it('resolves straight away when the API is already on window', async () => {
    const api = fakeTurnstile();
    window.turnstile = api;
    const loadTurnstile = await freshLoader();
    await expect(loadTurnstile()).resolves.toBe(api);
    expect(injectedScripts()).toHaveLength(0);
  });

  it('injects the script once, however many widgets ask', async () => {
    const loadTurnstile = await freshLoader();
    const first = loadTurnstile();
    const second = loadTurnstile();
    expect(injectedScripts()).toHaveLength(1);

    const api = fakeTurnstile();
    window.turnstile = api;
    injectedScripts()[0].dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(api);
    await expect(second).resolves.toBe(api);
  });

  it('lets the next caller retry after the script fails to load', async () => {
    const loadTurnstile = await freshLoader();
    const failed = loadTurnstile();
    injectedScripts()[0].dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow(/failed to load/);

    void loadTurnstile().catch(() => undefined);
    expect(injectedScripts()).toHaveLength(2);
  });
});
