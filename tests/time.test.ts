import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateKey,
  daysBetween,
  formatMinutes,
  isWeekend,
  rangeKeys,
  startOfWeekKey,
  tzOffsetMinutes,
  weekdayOf,
  zonedStartOfDay
} from '@/lib/time';

const IST = 'Asia/Kolkata';

describe('time helpers', () => {
  it('derives the calendar day in the configured zone', () => {
    // 20:00 UTC on 8 Nov is 01:30 on 9 Nov in India.
    expect(dateKey('2026-11-08T20:00:00Z', IST)).toBe('2026-11-09');
    expect(dateKey('2026-11-08T18:29:59Z', IST)).toBe('2026-11-08');
  });

  it('does day arithmetic across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
  });

  it('knows weekdays and weekends', () => {
    expect(weekdayOf('2026-11-08')).toBe(0); // Sunday
    expect(isWeekend('2026-11-07')).toBe(true);
    expect(isWeekend('2026-11-09')).toBe(false);
  });

  it('starts weeks on Monday', () => {
    expect(startOfWeekKey('2026-11-08')).toBe('2026-11-02');
    expect(startOfWeekKey('2026-11-09')).toBe('2026-11-09');
    expect(startOfWeekKey('2026-11-11')).toBe('2026-11-09');
  });

  it('lists inclusive ranges', () => {
    expect(rangeKeys('2026-11-01', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(rangeKeys('2026-11-03', '2026-11-01')).toEqual([]);
  });

  it('finds the start of a local day', () => {
    expect(tzOffsetMinutes(new Date('2026-11-08T00:00:00Z'), IST)).toBe(330);
    expect(zonedStartOfDay('2026-11-09', IST).toISOString()).toBe('2026-11-08T18:30:00.000Z');
  });

  it('handles daylight saving zones', () => {
    // New York switches from EDT (UTC-4) to EST (UTC-5) on 1 Nov 2026.
    expect(zonedStartOfDay('2026-11-01', 'America/New_York').toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(zonedStartOfDay('2026-11-02', 'America/New_York').toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('formats durations', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(125)).toBe('2h 05m');
    expect(formatMinutes(-10)).toBe('0m');
  });

  it('rejects malformed keys', () => {
    expect(() => addDays('2026-1-1', 1)).toThrow(RangeError);
  });
});
