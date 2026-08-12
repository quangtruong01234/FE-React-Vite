import { describe, it, expect } from 'vitest';
import { buildUserOrdersQuery, ORDER_SEARCH_MAX } from './orders';

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

  it('appends the order-code search and ANDs it with the status filter', () => {
    expect(buildUserOrdersQuery(1, 10, [], 'ord_42')).toBe('?page=1&limit=10&q=ord_42');
    expect(buildUserOrdersQuery(1, 10, ['pending'], 'ord_42')).toBe(
      '?page=1&limit=10&status=pending&q=ord_42',
    );
  });

  it('omits the key for a blank or whitespace-only term', () => {
    // A bare `?q=` is "match the empty string", not "unfiltered".
    expect(buildUserOrdersQuery(1, 10, [], '')).toBe('?page=1&limit=10');
    expect(buildUserOrdersQuery(1, 10, [], '   ')).toBe('?page=1&limit=10');
  });

  it('trims the term so a stray space never becomes part of the match', () => {
    expect(buildUserOrdersQuery(1, 10, [], '  ord_42  ')).toBe('?page=1&limit=10&q=ord_42');
  });

  it('caps the term at the length the backend accepts — over it the API 400s', () => {
    const long = 'x'.repeat(ORDER_SEARCH_MAX + 20);
    const qs = buildUserOrdersQuery(1, 10, [], long);
    expect(qs).toBe(`?page=1&limit=10&q=${'x'.repeat(ORDER_SEARCH_MAX)}`);
  });
});
