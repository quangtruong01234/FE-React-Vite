import { describe, it, expect } from 'vitest';
import { submitterLabel } from './submitterLabel';

describe('submitterLabel', () => {
  it('renders a public id bare, without the old "#" row-number prefix', () => {
    expect(submitterLabel('usr_60ccb7b981c411f1')).toBe('usr_60ccb7b981c411f1');
  });

  it('renders a dash when the submitting account no longer resolves (null)', () => {
    expect(submitterLabel(null)).toBe('—');
  });

  it('renders a dash when the field is absent (user service down)', () => {
    expect(submitterLabel(undefined)).toBe('—');
  });

  it('still renders the numeric id prod sends until IDLEAK-02 ships', () => {
    expect(submitterLabel(23)).toBe('23');
  });

  it('treats a blank value as missing rather than printing an empty cell', () => {
    expect(submitterLabel('   ')).toBe('—');
  });
});
