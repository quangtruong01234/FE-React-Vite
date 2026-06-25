import { describe, it, expect } from 'vitest';
import { chatConnectionBanner, type ChatConnectionStatus } from './chatConnection';

describe('chatConnectionBanner', () => {
  it('returns null when connected (no banner)', () => {
    expect(chatConnectionBanner('connected')).toBeNull();
  });

  it('shows an info banner while connecting', () => {
    expect(chatConnectionBanner('connecting')).toEqual({ text: 'Đang kết nối…', tone: 'info' });
  });

  it('shows an error banner while reconnecting', () => {
    const banner = chatConnectionBanner('reconnecting');
    expect(banner?.tone).toBe('error');
    expect(banner?.text).toMatch(/thử lại/);
  });

  it('shows an error banner when disconnected', () => {
    const banner = chatConnectionBanner('disconnected');
    expect(banner?.tone).toBe('error');
  });

  it('covers every status value', () => {
    const all: ChatConnectionStatus[] = ['connecting', 'connected', 'reconnecting', 'disconnected'];
    for (const s of all) {
      // should not throw and returns null or a well-formed banner
      const b = chatConnectionBanner(s);
      expect(b === null || (typeof b.text === 'string' && (b.tone === 'info' || b.tone === 'error'))).toBe(true);
    }
  });
});
