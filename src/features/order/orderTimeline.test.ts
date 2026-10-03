import { describe, expect, it } from 'vitest';
import type { OrderTimelineEvent } from '@/types';
import { ghnStatusLabel, orderTimelineRows } from './orderTimeline';

const at = '2026-10-02T17:41:28.651Z';

describe('ghnStatusLabel', () => {
  it('maps known GHN codes to buyer copy', () => {
    expect(ghnStatusLabel('ready_to_pick')).toBe('Chờ lấy hàng');
    expect(ghnStatusLabel('delivery_fail', 'en')).toBe('Delivery attempt failed');
  });

  // The carrier can send codes the FE has never seen (DEV even sends `teleported`):
  // show the raw code rather than nothing or a crash.
  it('falls back to the raw code for an unknown status', () => {
    expect(ghnStatusLabel('teleported')).toBe('teleported');
  });

  it('does not resolve inherited object keys as GHN codes', () => {
    expect(ghnStatusLabel('constructor')).toBe('constructor');
    expect(ghnStatusLabel('toString')).toBe('toString');
  });
});

describe('orderTimelineRows', () => {
  it('labels every event kind and keeps the server order', () => {
    const events: OrderTimelineEvent[] = [
      { kind: 'placed', status: 'pending', ghnStatus: null, at },
      { kind: 'paid', status: null, ghnStatus: null, at },
      { kind: 'status', status: 'confirmed', ghnStatus: null, at },
      { kind: 'shipping', status: null, ghnStatus: 'picked', at },
    ];
    expect(orderTimelineRows(events, 'en')).toEqual([
      { key: 'placed-0', label: 'Order placed', carrier: false, at },
      { key: 'paid-1', label: 'Payment received', carrier: false, at },
      { key: 'status-2', label: 'Confirmed', carrier: false, at },
      { key: 'shipping-3', label: 'Picked up', carrier: true, at },
    ]);
  });

  // Orders placed before 2026-10-02 have no `status` events at all — only
  // placed/paid/shipping. That is a complete timeline, not an error.
  it('renders a legacy timeline without status events', () => {
    const rows = orderTimelineRows([
      { kind: 'placed', status: 'pending', ghnStatus: null, at },
      { kind: 'shipping', status: null, ghnStatus: 'delivered', at },
    ]);
    expect(rows.map((row) => row.label)).toEqual(['Đặt hàng', 'Giao thành công']);
  });

  it('falls back to a generic label when a status/shipping event has no value', () => {
    const rows = orderTimelineRows(
      [
        { kind: 'status', status: null, ghnStatus: null, at },
        { kind: 'shipping', status: null, ghnStatus: null, at },
      ],
      'en',
    );
    expect(rows.map((row) => row.label)).toEqual(['Status updated', 'Status updated']);
  });
});
