import { describe, it, expect } from 'vitest';
import { buildUserOrdersQuery } from './orders';

describe('buildUserOrdersQuery', () => {
  it('sends page + limit and no status key when unfiltered', () => {
    // `?status=` is an invalid VALUE, not "unfiltered" — the key must be absent.
    expect(buildUserOrdersQuery(1, 10)).toBe('?page=1&limit=10');
    expect(buildUserOrdersQuery(1, 10, [])).toBe('?page=1&limit=10');
  });

  it('appends the SINGULAR repeated key the gateway expects', () => {
    expect(buildUserOrdersQuery(1, 10, ['return_requested', 'refunded'])).toBe(
      '?page=1&limit=10&status=return_requested&status=refunded',
    );
  });

  it('never emits bracket syntax — the Express query parser strips it and 400s', () => {
    const qs = buildUserOrdersQuery(2, 10, ['pending', 'confirmed']);
    expect(qs).not.toContain('[]');
    expect(qs).not.toContain('%5B%5D');
    expect(qs).not.toMatch(/statuses=/);
  });

  it('keeps the requested page so a filtered tab paginates on its own', () => {
    expect(buildUserOrdersQuery(3, 10, ['completed'])).toBe(
      '?page=3&limit=10&status=completed',
    );
  });
});
