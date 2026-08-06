import { describe, it, expect } from 'vitest';
import { duplicateWarningView } from './duplicateCheck';
import type { DuplicateCheckResult } from '@/types';

const flagged: DuplicateCheckResult = {
  duplicateLikely: true,
  match: {
    productId: 'prod_0000000000000012',
    name: 'Tai nghe XYZ',
    imageUrl: 'https://res.cloudinary.com/demo/match.jpg',
    hammingDistance: 3,
    evidenceCount: 2,
  },
};

const checkedUrl = 'https://res.cloudinary.com/demo/upload.jpg';

describe('duplicateWarningView', () => {
  it('builds a warning naming the matched product when the check flags a likely duplicate', () => {
    const view = duplicateWarningView(flagged, checkedUrl, [checkedUrl], false);
    expect(view).not.toBeNull();
    expect(view?.message).toContain('Tai nghe XYZ');
    expect(view?.message).toContain('vẫn có thể tiếp tục đăng');
    expect(view?.matchedProductId).toBe('prod_0000000000000012');
    expect(view?.matchedName).toBe('Tai nghe XYZ');
  });

  it('returns null when there is no result yet or no likely duplicate', () => {
    expect(duplicateWarningView(undefined, checkedUrl, [checkedUrl], false)).toBeNull();
    expect(duplicateWarningView({ duplicateLikely: false, match: null }, checkedUrl, [checkedUrl], false)).toBeNull();
  });

  it('returns null when duplicateLikely is true but match is missing (defensive)', () => {
    expect(duplicateWarningView({ duplicateLikely: true, match: null }, checkedUrl, [checkedUrl], false)).toBeNull();
  });

  it('returns null once the seller dismissed the warning', () => {
    expect(duplicateWarningView(flagged, checkedUrl, [checkedUrl], true)).toBeNull();
  });

  it('returns null when the flagged image was removed from the form', () => {
    expect(duplicateWarningView(flagged, checkedUrl, ['https://res.cloudinary.com/demo/other.jpg'], false)).toBeNull();
    expect(duplicateWarningView(flagged, checkedUrl, [], false)).toBeNull();
    expect(duplicateWarningView(flagged, null, [checkedUrl], false)).toBeNull();
  });
});
