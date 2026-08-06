import { describe, it, expect } from 'vitest';
import { mergeLocalOptions } from './localOptions';

interface Option {
  id: number;
  name: string;
}

describe('mergeLocalOptions', () => {
  it('normalizes string ids from the API to numbers', () => {
    const props = [{ id: '3' as unknown as number, name: 'Sony' }];
    expect(mergeLocalOptions<Option>(props, [])).toEqual([{ id: 3, name: 'Sony' }]);
  });

  it('keeps session-created rows that are not in the prop list', () => {
    const props = [{ id: 1, name: 'Sony' }];
    const prev = [{ id: 9, name: 'Hãng mới (chờ duyệt)' }];
    expect(mergeLocalOptions<Option>(props, prev)).toEqual([
      { id: 1, name: 'Sony' },
      { id: 9, name: 'Hãng mới (chờ duyệt)' },
    ]);
  });

  it('dedupes a previously-local row once the prop list contains it', () => {
    const props = [{ id: 1, name: 'Sony' }, { id: 9, name: 'Hãng mới' }];
    const prev = [{ id: 9, name: 'Hãng mới' }];
    expect(mergeLocalOptions<Option>(props, prev)).toHaveLength(2);
  });

  it('normalizes prev string ids so an early-loaded list does not duplicate', () => {
    const props = [{ id: 1, name: 'Sony' }];
    const prev = [{ id: '1' as unknown as number, name: 'Sony' }];
    expect(mergeLocalOptions<Option>(props, prev)).toEqual([{ id: 1, name: 'Sony' }]);
  });
});
