import 'server-only';
import { countByDay, dailySeries, minutesByDay, summarise, targetMinutesFor } from '@/lib/metrics';
import { listCommits, listSessions, listTasks, listUpdates } from '@/lib/queries';
import { addDays, dateKey, formatDateKey, startOfWeekKey, todayKey, zonedStartOfDay } from '@/lib/time';
import type { AttendanceSession, Commit, DailyUpdate, Profile, Task } from '@/lib/types';
import type { PersonRow } from '@/components/work/PeopleTable';

/**
 * Everything the team page and admin dashboard need for a set of people,
 * loaded in parallel and aggregated once.
 */
export interface TeamSnapshot {
  today: string;
  weekStart: string;
  rows: PersonRow[];
  sessions: AttendanceSession[];
  updates: DailyUpdate[];
  tasks: Task[];
  commits: Commit[];
  /** Commits per day for the last `commitDays` days, one key per person. */
  commitChart: Array<Record<string, string | number>>;
  commitKeys: { key: string; name: string }[];
}

export async function loadTeamSnapshot(
  people: Profile[],
  tz: string,
  options: { commitDays?: number; historyDays?: number; tasks?: Task[] } = {}
): Promise<TeamSnapshot> {
  const { commitDays = 14, historyDays = 7 } = options;
  const now = new Date();
  const today = todayKey(tz, now);
  const weekStart = startOfWeekKey(today);
  const ids = people.map((p) => p.id);
  const historyStart = addDays(today, -(Math.max(historyDays, 7) - 1));
  const sessionsFrom = weekStart < historyStart ? weekStart : historyStart;
  const commitStart = addDays(today, -(commitDays - 1));

  const [sessions, updates, tasks, commits] = await Promise.all([
    listSessions(ids, zonedStartOfDay(sessionsFrom, tz)),
    listUpdates(ids, addDays(today, -(historyDays - 1)), today),
    options.tasks ? Promise.resolve(options.tasks) : listTasks({ includeDone: false }),
    listCommits({ userIds: ids, since: zonedStartOfDay(commitStart, tz), limit: 5000 })
  ]);

  const sevenDaysAgo = zonedStartOfDay(addDays(today, -6), tz).toISOString();

  const rows: PersonRow[] = people.map((p) => {
    const mine = sessions.filter((s) => s.user_id === p.id);
    const open = mine.find((s) => s.check_out === null) ?? null;
    const byDay = minutesByDay(mine, tz, now);
    const week = summarise(dailySeries(mine, p, weekStart, addDays(weekStart, 6), tz, now));
    return {
      id: p.id,
      name: p.full_name,
      subtitle: p.job_title ?? (p.member_type === 'intern' ? 'Intern' : 'Employee'),
      workingSince: open?.check_in ?? null,
      todayMinutes: byDay.get(today) ?? 0,
      todayTarget: targetMinutesFor(p, today),
      weekMinutes: week.minutes,
      weekTarget: week.target,
      updateToday: updates.some((u) => u.user_id === p.id && u.work_date === today),
      commits7d: commits.filter((c) => c.user_id === p.id && c.committed_at >= sevenDaysAgo).length,
      openTasks: tasks.filter((t) => t.assignee_id === p.id && t.status !== 'done').length
    };
  });

  // Order: working now first, then by hours this week.
  rows.sort((a, b) => Number(!!b.workingSince) - Number(!!a.workingSince) || b.weekMinutes - a.weekMinutes);

  const commitKeys = people
    .filter((p) => commits.some((c) => c.user_id === p.id))
    .map((p) => ({ key: p.id, name: p.full_name.split(' ')[0] ?? p.full_name }));
  const days = countByDay([], commitStart, today, tz).map((d) => d.date);
  const commitChart = days.map((date) => {
    const point: Record<string, string | number> = { label: formatDateKey(date) };
    for (const k of commitKeys) point[k.key] = 0;
    return point;
  });
  const indexByDate = new Map(days.map((d, i) => [d, i]));
  for (const c of commits) {
    if (!c.user_id) continue;
    const i = indexByDate.get(dateKey(c.committed_at, tz));
    const point = i === undefined ? undefined : commitChart[i];
    if (point && c.user_id in point) point[c.user_id] = Number(point[c.user_id]) + 1;
  }

  return { today, weekStart, rows, sessions, updates, tasks, commits, commitChart, commitKeys };
}
