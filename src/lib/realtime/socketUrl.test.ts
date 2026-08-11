import { describe, it, expect } from 'vitest';
import { resolveSocketUrl } from './socketUrl';

describe('resolveSocketUrl', () => {
  it('returns the bare namespace for the same-origin production value', () => {
    // socket.io reads this as "current origin, /notifications namespace", which
    // is what routes the handshake through the Worker proxy with the cookie.
    expect(resolveSocketUrl('/', '/notifications')).toBe('/notifications');
    expect(resolveSocketUrl('', '/chat')).toBe('/chat');
    expect(resolveSocketUrl('  ', '/chat')).toBe('/chat');
  });

  it('keeps an absolute origin for local dev', () => {
    expect(resolveSocketUrl('http://localhost:3000', '/chat')).toBe('http://localhost:3000/chat');
  });

  it('does not double the slash when the origin has a trailing one', () => {
    expect(resolveSocketUrl('https://api.example.com/', '/notifications')).toBe(
      'https://api.example.com/notifications',
    );
  });

  it('falls back to the local gateway when the env var is unset', () => {
    expect(resolveSocketUrl(undefined, '/chat')).toBe('http://localhost:3000/chat');
  });
});
