import { describe, it, expect } from 'vitest';
import { narrowsHistory, isHistoryIncomplete } from './orderHistoryPaging';

describe('narrowsHistory', () => {
  it('is false on the unfiltered, unsearched list', () => {
    expect(narrowsHistory('all', '')).toBe(false);
    expect(narrowsHistory('all', '   ')).toBe(false);
  });

  it('is true for every status tab', () => {
    expect(narrowsHistory('pending', '')).toBe(true);
    expect(narrowsHistory('completed', '')).toBe(true);
    expect(narrowsHistory('return', '')).toBe(true);
    expect(narrowsHistory('canceled', '')).toBe(true);
  });

  it('is true when searching, even on the "all" tab', () => {
    expect(narrowsHistory('all', 'ord_516')).toBe(true);
  });
});

describe('isHistoryIncomplete', () => {
  it('flags a narrowed view that still has unloaded pages', () => {
    // The live case: "Trả hàng/Hoàn tiền (1)" while the refunded order sits on
    // page 2. An empty list here means "not finished looking", not "none".
    expect(isHistoryIncomplete('return', '', true)).toBe(true);
    expect(isHistoryIncomplete('all', 'ord_516', true)).toBe(true);
  });

  it('is false once every page is loaded', () => {
    expect(isHistoryIncomplete('return', '', false)).toBe(false);
    expect(isHistoryIncomplete('all', 'ord_516', false)).toBe(false);
  });

  it('is false on the unfiltered list, which pages on demand instead', () => {
    // `all` shows every loaded row already, so a remaining page is a "Tải thêm"
    // affordance — not a reason to auto-fetch or to suppress the empty state.
    expect(isHistoryIncomplete('all', '', true)).toBe(false);
  });
});
