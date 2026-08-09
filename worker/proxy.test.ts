// @vitest-environment node
// Worker code runs on workerd, not in a DOM. Node 22 supplies the same
// Headers/URL globals workerd does; jsdom does not implement Headers at all.
import { describe, it, expect } from 'vitest';
import { buildUpstreamHeaders, isProxiedPath, methodAllowsBody, resolveUpstreamUrl } from './proxy';

const GATEWAY = 'https://gateway.example.com';
const WORKER = 'https://fe.example.workers.dev';

describe('isProxiedPath', () => {
  it('matches /api and everything under it', () => {
    expect(isProxiedPath('/api')).toBe(true);
    expect(isProxiedPath('/api/user/me')).toBe(true);
  });

  it('does not match app routes that merely start with the same letters', () => {
    expect(isProxiedPath('/apifoo')).toBe(false);
    expect(isProxiedPath('/')).toBe(false);
    expect(isProxiedPath('/product/prod_x')).toBe(false);
  });
});

describe('resolveUpstreamUrl', () => {
  it('swaps the origin and keeps the /api prefix', () => {
    expect(resolveUpstreamUrl(`${WORKER}/api/user/me`, GATEWAY)).toBe(`${GATEWAY}/api/user/me`);
  });

  it('preserves the query string', () => {
    expect(resolveUpstreamUrl(`${WORKER}/api/products?page=1&limit=20`, GATEWAY)).toBe(
      `${GATEWAY}/api/products?page=1&limit=20`,
    );
  });

  it('keeps encoded public ids untouched', () => {
    expect(resolveUpstreamUrl(`${WORKER}/api/order/ord_9aB%2Fc`, GATEWAY)).toBe(
      `${GATEWAY}/api/order/ord_9aB%2Fc`,
    );
  });

  it('returns null for non-API paths so the caller can serve the SPA', () => {
    expect(resolveUpstreamUrl(`${WORKER}/product/prod_x`, GATEWAY)).toBeNull();
    expect(resolveUpstreamUrl(`${WORKER}/`, GATEWAY)).toBeNull();
  });
});

describe('buildUpstreamHeaders', () => {
  it('drops Host so nginx matches the gateway server block', () => {
    const headers = buildUpstreamHeaders(new Headers({ host: 'fe.example.workers.dev' }), null);
    expect(headers.get('host')).toBeNull();
  });

  it('drops hop-by-hop headers', () => {
    const headers = buildUpstreamHeaders(
      new Headers({ connection: 'keep-alive', 'transfer-encoding': 'chunked', upgrade: 'websocket' }),
      null,
    );
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('transfer-encoding')).toBeNull();
    expect(headers.get('upgrade')).toBeNull();
  });

  it('forwards the auth cookie and content type unchanged', () => {
    const headers = buildUpstreamHeaders(
      new Headers({ cookie: 'access_token=jwt', 'content-type': 'application/json' }),
      null,
    );
    expect(headers.get('cookie')).toBe('access_token=jwt');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('sets X-Forwarded-For from the real client IP', () => {
    const headers = buildUpstreamHeaders(new Headers(), '203.0.113.9');
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.9');
  });

  it('appends to an existing X-Forwarded-For rather than replacing it', () => {
    const headers = buildUpstreamHeaders(new Headers({ 'x-forwarded-for': '198.51.100.1' }), '203.0.113.9');
    expect(headers.get('x-forwarded-for')).toBe('198.51.100.1, 203.0.113.9');
  });

  it('leaves X-Forwarded-For alone when Cloudflare gives no client IP', () => {
    const headers = buildUpstreamHeaders(new Headers({ 'x-forwarded-for': '198.51.100.1' }), null);
    expect(headers.get('x-forwarded-for')).toBe('198.51.100.1');
  });
});

describe('methodAllowsBody', () => {
  it('is false for the bodyless methods fetch rejects a body on', () => {
    expect(methodAllowsBody('GET')).toBe(false);
    expect(methodAllowsBody('get')).toBe(false);
    expect(methodAllowsBody('HEAD')).toBe(false);
  });

  it('is true for the mutating methods the app uses', () => {
    expect(methodAllowsBody('POST')).toBe(true);
    expect(methodAllowsBody('PATCH')).toBe(true);
    expect(methodAllowsBody('PUT')).toBe(true);
    expect(methodAllowsBody('DELETE')).toBe(true);
  });
});
