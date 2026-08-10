import { describe, it, expect } from 'vitest';
import { narrowsHistory, isHistoryIncomplete } from './orderHistoryPaging';

describe('narrowsHistory', () => {
  it('is false without a search term', () => {
    expect(narrowsHistory('')).toBe(false);
    expect(narrowsHistory('   ')).toBe(false);
  });

  it('is true while searching', () => {
    expect(narrowsHistory('ord_516')).toBe(true);
  });
});

describe('isHistoryIncomplete', () => {
  it('flags a searched view that still has unloaded pages', () => {
    // The order-id box has no server-side counterpart, so a match can sit on a
    // page nobody has fetched — an empty list here means "not finished looking".
    expect(isHistoryIncomplete('ord_516', true)).toBe(true);
  });

  it('is false once every page is loaded', () => {
    expect(isHistoryIncomplete('ord_516', false)).toBe(false);
  });

  it('is false without a search, which pages on demand instead', () => {
    // Status tabs are filtered server-side now: every loaded row already belongs
    // to the tab, so a remaining page is a "Tải thêm" affordance — not a reason
    // to auto-fetch or to suppress the empty state.
    expect(isHistoryIncomplete('', true)).toBe(false);
  });
});
