import { describe, expect, it } from 'vitest';
import headerSource from './Header.tsx?raw';
import mobileNavSource from './MobileNav.tsx?raw';
import dialogSource from '../ui/dialog.tsx?raw';
import sheetSource from '../ui/sheet.tsx?raw';
import feedPageSource from '../../features/social/FeedPage.tsx?raw';

/**
 * The z-index of the first class list containing `anchor`, read from the real source so
 * the test breaks when someone re-raises the app chrome. `z-50` → 50, `z-[45]` → 45.
 */
function zIndexAt(source: string, anchor: string): number {
  const line = source.split('\n').find((l) => l.includes(anchor));
  if (line === undefined) throw new Error(`anchor not found: ${anchor}`);
  const match = /(?:^|[\s"'`])z-(?:\[(\d+)\]|(\d+))(?=[\s"'`]|$)/.exec(line);
  if (match === null) throw new Error(`no z-index class on: ${line.trim()}`);
  return Number(match[1] ?? match[2]);
}

const overlays = {
  dialog: zIndexAt(dialogSource, 'fixed inset-0 z-'),
  sheet: zIndexAt(sheetSource, 'fixed inset-0 z-'),
};
const chrome = {
  Header: zIndexAt(headerSource, '<header className='),
  MobileNav: zIndexAt(mobileNavSource, '<nav className='),
};

describe('app chrome stacking', () => {
  it.each(Object.entries(chrome))('%s sits under every modal overlay, so a dialog dims it', (_name, z) => {
    for (const overlay of Object.values(overlays)) expect(z).toBeLessThan(overlay);
  });

  it('Header stays above the sticky feed tabs, so its dropdowns are not covered on scroll', () => {
    expect(chrome.Header).toBeGreaterThan(zIndexAt(feedPageSource, 'sticky top-[72px]'));
  });
});
