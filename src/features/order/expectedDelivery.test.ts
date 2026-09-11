import { describe, expect, it } from 'vitest';
import { expectedDeliveryLabel } from './expectedDelivery';

describe('expectedDeliveryLabel', () => {
  it('renders the quoted delivery date', () => {
    expect(expectedDeliveryLabel('2026-09-13T16:59:59.000Z')).toBe('Dự kiến giao: 13/09/2026');
  });

  // GHN commits to a day, not an hour — the 16:59:59Z it returns is 23:59:59 VN
  // time, so printing a clock time would invent precision the carrier never gave.
  it('never prints a time of day', () => {
    expect(expectedDeliveryLabel('2026-09-13T16:59:59.000Z')).not.toMatch(/\d{1,2}:\d{2}/);
  });

  // SHAPE-01 §2: nullable from the first release. An order with no waybill yet,
  // and every order created before the backend shipped this, is permanently null.
  it('shows nothing rather than a placeholder when there is no date', () => {
    expect(expectedDeliveryLabel(null)).toBeNull();
    expect(expectedDeliveryLabel(undefined)).toBeNull();
    expect(expectedDeliveryLabel('')).toBeNull();
  });

  it('shows nothing for an unparseable value', () => {
    expect(expectedDeliveryLabel('not-a-date')).toBeNull();
  });
});
