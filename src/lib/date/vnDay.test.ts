import { describe, it, expect } from 'vitest';
import { toVnIsoDay, vnIsoDayBefore, VN_UTC_OFFSET_MINUTES } from './vnDay';

describe('toVnIsoDay', () => {
  it('is the same day when VN and UTC agree', () => {
    // 19:00 VN on 9 Jul — both zones are still on the 9th.
    expect(toVnIsoDay(new Date('2026-07-09T12:00:00.000Z'))).toBe('2026-07-09');
  });

  it('is still today late in the VN evening', () => {
    // 23:30 VN on 30 Sep, which UTC also calls the 30th.
    expect(toVnIsoDay(new Date('2026-09-30T16:30:00.000Z'))).toBe('2026-09-30');
  });

  it('is already tomorrow in the 17:00-24:00 UTC window — the bug this fixes', () => {
    // 00:30 VN on 1 Oct. UTC still reads 30 Sep, which is what made the picker
    // show yesterday to a seller working before 7am.
    expect(toVnIsoDay(new Date('2026-09-30T17:30:00.000Z'))).toBe('2026-10-01');
    // 02:00 VN on 20 Sep — the case the CSV export was reported on.
    expect(toVnIsoDay(new Date('2026-09-19T19:00:00.000Z'))).toBe('2026-09-20');
  });

  it('rolls the year over', () => {
    // 06:00 VN on 1 Jan 2027, still 31 Dec 2026 in UTC.
    expect(toVnIsoDay(new Date('2026-12-31T23:00:00.000Z'))).toBe('2027-01-01');
  });

  it('matches a bare YYYY-MM-DD parsed as UTC midnight', () => {
    // The round trip the export's overflow guard depends on: UTC midnight is
    // 07:00 VN on the SAME calendar day, so the day survives.
    expect(toVnIsoDay(new Date('2026-02-28T00:00:00.000Z'))).toBe('2026-02-28');
  });

  it('pins the offset at UTC+7', () => {
    expect(VN_UTC_OFFSET_MINUTES).toBe(420);
  });
});

describe('vnIsoDayBefore', () => {
  it('steps back whole VN days', () => {
    const now = new Date('2026-07-09T12:00:00.000Z');
    expect(vnIsoDayBefore(now, 0)).toBe('2026-07-09');
    expect(vnIsoDayBefore(now, 6)).toBe('2026-07-03');
    expect(vnIsoDayBefore(now, 29)).toBe('2026-06-10');
  });

  it('steps back from the VN day, not the UTC one', () => {
    // 02:00 VN on 20 Sep; one day back is 19 Sep, not 18 Sep.
    expect(vnIsoDayBefore(new Date('2026-09-19T19:00:00.000Z'), 1)).toBe('2026-09-19');
  });
});
