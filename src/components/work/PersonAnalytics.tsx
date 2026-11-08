import { appTimezone } from '@/lib/env';
import { countByDay, dailySeries, isOverdue, summarise, targetMinutesFor, updateStreak } from '@/lib/metrics';
import { listCommits, listSessions, listTasks, listUpdates } from '@/lib/queries';
import { addDays, dateKey, formatDateKey, formatDateTime, formatMinutes, rangeKeys, todayKey, zonedStartOfDay } from '@/lib/time';
import type { Profile } from '@/lib/types';
import { Card, CardBody, CardHeader, EmptyState, Stat } from '@/components/ui';
import { HoursChart } from '@/components/charts/HoursChart';
import { CountChart } from '@/components/charts/CountChart';
import { CommitList } from './CommitList';

/**
 * Charts and history for one person over the last `days` days. Used on the
 * member performance page and the admin person page.
 */
export async function PersonAnalytics({ profile, days = 30, showUpdates = true }: { profile: Profile; days?: number; showUpdates?: boolean }) {
  const tz = appTimezone();
  const now = new Date();
  const today = todayKey(tz, now);
  const start = addDays(today, -(days - 1));
  const since = zonedStartOfDay(start, tz);

  const [sessions, updates, tasks, commits] = await Promise.all([
    listSessions([profile.id], since),
    listUpdates([profile.id], start, today),
    listTasks({ assigneeId: profile.id }),
    listCommits({ userIds: [profile.id], since, limit: 2000 })
  ]);

  const series = dailySeries(sessions, profile, start, today, tz, now);
  const summary = summarise(series);
  const workingDays = series.filter((p) => p.target > 0).length;
  const updateKeys = new Set(updates.map((u) => u.work_date));
  const updatesOnTargetDays = rangeKeys(start, today).filter((d) => targetMinutesFor(profile, d) > 0 && updateKeys.has(d)).length;
  const streak = updateStreak(updateKeys, today);

  const completedInRange = tasks.filter((t) => t.completed_at && t.completed_at >= since.toISOString());
  const completedOnTime = completedInRange.filter((t) => !t.due_date || dateKey(t.completed_at!, tz) <= t.due_date).length;
  const overdueNow = tasks.filter((t) => isOverdue(t, today)).length;

  const hoursData = series.map((p) => ({
    label: formatDateKey(p.date),
    hours: Math.round((p.minutes / 60) * 10) / 10,
    target: Math.round((p.target / 60) * 10) / 10
  }));
  const commitData = countByDay(
    commits.map((c) => c.committed_at),
    start,
    today,
    tz
  ).map((p) => ({ label: formatDateKey(p.date), commits: p.count }));
  const avgPerDay = summary.daysPresent > 0 ? summary.minutes / summary.daysPresent : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={`Hours, last ${days} days`}
          value={formatMinutes(summary.minutes)}
          hint={summary.target > 0 ? `${Math.round((summary.completion ?? 0) * 100)}% of ${formatMinutes(summary.target)} target` : 'No target set'}
        />
        <Stat label="Days worked" value={`${summary.daysPresent}`} hint={`Average ${formatMinutes(avgPerDay)} on days worked`} />
        <Stat
          label="Daily updates"
          value={`${updatesOnTargetDays}/${workingDays}`}
          hint={streak > 0 ? `Current streak: ${streak} ${streak === 1 ? 'day' : 'days'}` : 'No current streak'}
          tone={workingDays > 0 && updatesOnTargetDays / workingDays < 0.6 ? 'warn' : 'default'}
        />
        <Stat
          label="Tasks completed"
          value={completedInRange.length}
          hint={completedInRange.length > 0 ? `${completedOnTime} on time · ${overdueNow} overdue now` : `${overdueNow} overdue now`}
          tone={overdueNow > 0 ? 'warn' : 'default'}
        />
      </div>

      <Card>
        <CardHeader title="Hours per day" description="Bars show hours worked. The dashed line is the target for that day." />
        <CardBody>
          <HoursChart data={hoursData} height={260} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Commits per day" description={profile.github_username ? `GitHub: ${profile.github_username}` : 'No GitHub username on file'} />
          <CardBody>
            <CountChart data={commitData} keys={[{ key: 'commits', name: 'Commits' }]} label="Commits per day" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent commits" description={`${commits.length} in the last ${days} days`} />
          <CommitList commits={commits} limit={8} />
        </Card>
      </div>

      {showUpdates ? (
        <Card>
          <CardHeader title="Daily updates" description={`Last ${days} days`} />
          {updates.length === 0 ? (
            <EmptyState title="No updates yet" />
          ) : (
            <ul className="divide-y divide-line">
              {updates.slice(0, 10).map((u) => (
                <li key={u.id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-semibold text-ink">{formatDateKey(u.work_date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="text-[11px] text-ink-subtle">Submitted {formatDateTime(u.created_at, tz)}</p>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{u.done}</p>
                  {u.next_steps ? (
                    <p className="mt-2 text-xs text-ink-muted">
                      <span className="font-medium text-ink">Next:</span> {u.next_steps}
                    </p>
                  ) : null}
                  {u.blockers ? (
                    <p className="mt-1 text-xs text-amber-800">
                      <span className="font-medium">Blockers:</span> {u.blockers}
                    </p>
                  ) : null}
                  {u.links.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {u.links.map((l) => (
                        <li key={l}>
                          <a href={l} target="_blank" rel="noreferrer" className="break-all text-xs text-brand-600 hover:underline">
                            {l.replace(/^https?:\/\//, '')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
