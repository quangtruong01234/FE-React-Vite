import { describe, expect, it } from 'vitest';
import html from '../../../index.html?raw';

// PERF-FONT-01: a plain <link rel="stylesheet"> to Google Fonts blocks first paint
// for a cross-origin round trip (~900ms on the /login Lighthouse run).
describe('the Google Fonts stylesheet in index.html', () => {
  const head = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const links = head.match(/<link[^>]*fonts\.googleapis\.com\/css2[^>]*>/g) ?? [];

  it('is linked exactly once outside <noscript>', () => {
    expect(links).toHaveLength(1);
  });

  it('does not block render: loads as print, flips to all on load', () => {
    expect(links[0]).toContain('media="print"');
    expect(links[0]).toContain(`onload="this.media='all'"`);
  });

  it('keeps display=swap so text paints in the fallback before the font lands', () => {
    expect(links[0]).toContain('display=swap');
  });

  it('still loads the fonts with scripts disabled', () => {
    expect(html).toMatch(/<noscript><link[^>]*fonts\.googleapis\.com\/css2[^>]*rel="stylesheet"[^>]*><\/noscript>/);
  });
});
