import type { AttendanceSession, Task, TargetProfile } from './types';
import { addDays, dateKey, isWeekend, rangeKeys, zonedStartOfDay } from './time';

/**
 * Pure aggregation functions behind every chart and summary. They take plain
 * rows and return plain data, so they are easy to test and reuse on server
 * and client.
 */

/** Sessions longer than this are treated as forgotten check-outs and capped. */
export const MAX_SESSION_MS = 16 * 60 * 60 * 1000;

function sessionEnd(session: Pick<AttendanceSession, 'check_in' | 'check_out'>, now: Date): number {
  const start = new Date(session.check_in).getTime();
  const end = session.check_out ? new Date(session.check_out).getTime() : now.getTime();
  return Math.min(end, start + MAX_SESSION_MS);
}

/**
 * Minutes worked per calendar day. Sessions that cross midnight are split at
 * the day boundary in the given zone. Open sessions count up to `now`.
 */
export function minutesByDay(
  sessions: ReadonlyArray<Pick<AttendanceSession, 'check_in' | 'check_out'>>,
  tz: string,
  now: Date = new Date()
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    let cursor = new Date(s.check_in).getTime();
    const end = sessionEnd(s, now);
    while (cursor < end) {
      const key = dateKey(new Date(cursor), tz);
      const nextDayStart = zonedStartOfDay(addDays(key, 1), tz).getTime();
      const sliceEnd = Math.min(end, nextDayStart);
      totals.set(key, (totals.get(key) ?? 0) + (sliceEnd - cursor) / 60_000);
      cursor = sliceEnd;
    }
  }
  return totals;
}

/** Expected minutes on a day, or 0 outside the person's start and end dates. */
export function targetMinutesFor(profile: TargetProfile, key: string): number {
  if (profile.start_date && key < profile.start_date) return 0;
  if (profile.end_date && key > profile.end_date) return 0;
  return isWeekend(key) ? profile.weekend_target_minutes : profile.weekday_target_minutes;
}

export interface DayPoint {
  date: string;
  minutes: number;
  target: number;
}

export function dailySeries(
  sessions: ReadonlyArray<Pick<AttendanceSession, 'check_in' | 'check_out'>>,
  profile: TargetProfile,
  startKey: string,
  endKey: string,
  tz: string,
  now: Date = new Date()
): DayPoint[] {
  const byDay = minutesByDay(sessions, tz, now);
  return rangeKeys(startKey, endKey).map((date) => ({
    date,
    minutes: Math.round(byDay.get(date) ?? 0),
    target: targetMinutesFor(profile, date)
  }));
}

export interface RangeSummary {
  minutes: number;
  target: number;
  daysPresent: number;
  /** 0..1, capped at 1. Null when there is no target in the range. */
  completion: number | null;
}

export function summarise(series: readonly DayPoint[]): RangeSummary {
  let minutes = 0;
  let target = 0;
  let daysPresent = 0;
  for (const p of series) {
    minutes += p.minutes;
    target += p.target;
    if (p.minutes >= 1) daysPresent += 1;
  }
  return {
    minutes,
    target,
    daysPresent,
    completion: target > 0 ? Math.min(1, minutes / target) : null
  };
}

/** Heatmap intensity 0..4 for a day: 0 none, 4 target met. -1 when no target and no work. */
export function heatLevel(minutes: number, target: number): number {
  if (target <= 0) return minutes > 0 ? 4 : -1;
  if (minutes <= 0) return 0;
  const ratio = minutes / target;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}

/** Counts timestamped items per calendar day across an inclusive range. */
export function countByDay(
  timestamps: readonly string[],
  startKey: string,
  endKey: string,
  tz: string
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const key = dateKey(ts, tz);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return rangeKeys(startKey, endKey).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/**
 * Consecutive days with a daily update, counting back from today. A missing
 * update today does not break the streak until the day is over.
 */
export function updateStreak(updateKeys: Iterable<string>, today: string): number {
  const set = new Set(updateKeys);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function isOverdue(task: Pick<Task, 'status' | 'due_date'>, today: string): boolean {
  return task.status !== 'done' && task.due_date !== null && task.due_date < today;
}

export interface TaskStats {
  todo: number;
  in_progress: number;
  review: number;
  done: number;
  overdue: number;
  total: number;
}

export function taskStats(tasks: ReadonlyArray<Pick<Task, 'status' | 'due_date'>>, today: string): TaskStats {
  const stats: TaskStats = { todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0, total: tasks.length };
  for (const t of tasks) {
    stats[t.status] += 1;
    if (isOverdue(t, today)) stats.overdue += 1;
  }
  return stats;
}

/** Days remaining until an end date, or null if there is no end date. Never negative. */
export function daysRemaining(endDate: string | null, today: string): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - now) / 86_400_000));
}

/** Progress through a start..end period as 0..1, or null if either date is missing. */
export function periodProgress(startDate: string | null, endDate: string | null, today: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/**
 * Whether a person's attendance and work are tracked on dashboards. Admins
 * run the workspace and are left out of team metrics.
 */
export function isTracked(profile: { app_role: string; status: string }): boolean {
  return profile.app_role !== 'admin' && profile.status === 'active';
}
