import { describe, expect, it } from 'vitest';
import {
  countByDay,
  dailySeries,
  daysRemaining,
  heatLevel,
  isOverdue,
  minutesByDay,
  periodProgress,
  summarise,
  targetMinutesFor,
  taskStats,
  updateStreak
} from '@/lib/metrics';

const IST = 'Asia/Kolkata';
const profile = { weekday_target_minutes: 240, weekend_target_minutes: 240, start_date: '2026-11-02', end_date: '2027-02-01' };

describe('minutesByDay', () => {
  it('sums closed sessions per day', () => {
    const totals = minutesByDay(
      [
        { check_in: '2026-11-09T04:30:00Z', check_out: '2026-11-09T06:30:00Z' }, // 10:00-12:00 IST
        { check_in: '2026-11-09T08:30:00Z', check_out: '2026-11-09T09:15:00Z' } // 14:00-14:45 IST
      ],
      IST
    );
    expect(totals.get('2026-11-09')).toBe(165);
  });

  it('splits sessions that cross local midnight', () => {
    // 23:00 to 01:00 IST.
    const totals = minutesByDay([{ check_in: '2026-11-09T17:30:00Z', check_out: '2026-11-09T19:30:00Z' }], IST);
    expect(totals.get('2026-11-09')).toBe(60);
    expect(totals.get('2026-11-10')).toBe(60);
  });

  it('counts open sessions up to now', () => {
    const now = new Date('2026-11-09T06:00:00Z');
    const totals = minutesByDay([{ check_in: '2026-11-09T05:00:00Z', check_out: null }], IST, now);
    expect(totals.get('2026-11-09')).toBe(60);
  });

  it('caps forgotten check-outs at 16 hours', () => {
    const now = new Date('2026-11-12T00:00:00Z');
    const totals = minutesByDay([{ check_in: '2026-11-09T03:30:00Z', check_out: null }], IST, now);
    const total = [...totals.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(16 * 60);
  });
});

describe('targets and series', () => {
  it('has no target outside the period', () => {
    expect(targetMinutesFor(profile, '2026-11-01')).toBe(0);
    expect(targetMinutesFor(profile, '2026-11-02')).toBe(240);
    expect(targetMinutesFor(profile, '2027-02-02')).toBe(0);
  });

  it('uses the weekend target on Saturdays and Sundays', () => {
    const p = { ...profile, weekend_target_minutes: 480 };
    expect(targetMinutesFor(p, '2026-11-07')).toBe(480);
    expect(targetMinutesFor(p, '2026-11-06')).toBe(240);
  });

  it('builds a daily series and summary', () => {
    const series = dailySeries(
      [{ check_in: '2026-11-09T04:30:00Z', check_out: '2026-11-09T08:30:00Z' }],
      profile,
      '2026-11-09',
      '2026-11-10',
      IST,
      new Date('2026-11-11T00:00:00Z')
    );
    expect(series).toEqual([
      { date: '2026-11-09', minutes: 240, target: 240 },
      { date: '2026-11-10', minutes: 0, target: 240 }
    ]);
    expect(summarise(series)).toEqual({ minutes: 240, target: 480, daysPresent: 1, completion: 0.5 });
  });

  it('reports null completion without a target', () => {
    expect(summarise([{ date: '2026-11-01', minutes: 30, target: 0 }]).completion).toBeNull();
  });
});

describe('heatLevel', () => {
  it('grades by share of target', () => {
    expect(heatLevel(0, 240)).toBe(0);
    expect(heatLevel(60, 240)).toBe(1);
    expect(heatLevel(100, 240)).toBe(2);
    expect(heatLevel(200, 240)).toBe(3);
    expect(heatLevel(240, 240)).toBe(4);
    expect(heatLevel(0, 0)).toBe(-1);
    expect(heatLevel(30, 0)).toBe(4);
  });
});

describe('counts, streaks and tasks', () => {
  it('counts events per local day', () => {
    const result = countByDay(['2026-11-08T20:00:00Z', '2026-11-09T05:00:00Z', '2026-11-08T10:00:00Z'], '2026-11-08', '2026-11-09', IST);
    expect(result).toEqual([
      { date: '2026-11-08', count: 1 },
      { date: '2026-11-09', count: 2 }
    ]);
  });

  it('keeps a streak alive until the day ends', () => {
    expect(updateStreak(['2026-11-07', '2026-11-08'], '2026-11-09')).toBe(2);
    expect(updateStreak(['2026-11-07', '2026-11-08', '2026-11-09'], '2026-11-09')).toBe(3);
    expect(updateStreak(['2026-11-06'], '2026-11-09')).toBe(0);
  });

  it('flags overdue tasks and tallies statuses', () => {
    const tasks = [
      { status: 'todo' as const, due_date: '2026-11-01' },
      { status: 'done' as const, due_date: '2026-11-01' },
      { status: 'review' as const, due_date: null },
      { status: 'in_progress' as const, due_date: '2026-12-01' }
    ];
    expect(isOverdue(tasks[0]!, '2026-11-09')).toBe(true);
    expect(isOverdue(tasks[1]!, '2026-11-09')).toBe(false);
    expect(taskStats(tasks, '2026-11-09')).toEqual({ todo: 1, in_progress: 1, review: 1, done: 1, overdue: 1, total: 4 });
  });

  it('measures period progress', () => {
    expect(daysRemaining('2026-11-19', '2026-11-09')).toBe(10);
    expect(daysRemaining('2026-11-01', '2026-11-09')).toBe(0);
    expect(daysRemaining(null, '2026-11-09')).toBeNull();
    expect(periodProgress('2026-11-01', '2026-11-11', '2026-11-06')).toBe(0.5);
    expect(periodProgress(null, '2026-11-11', '2026-11-06')).toBeNull();
  });
});

describe('isTracked', () => {
  it('leaves admins and inactive people out of team metrics', async () => {
    const { isTracked } = await import('@/lib/metrics');
    expect(isTracked({ app_role: 'member', status: 'active' })).toBe(true);
    expect(isTracked({ app_role: 'admin', status: 'active' })).toBe(false);
    expect(isTracked({ app_role: 'member', status: 'inactive' })).toBe(false);
  });
});
