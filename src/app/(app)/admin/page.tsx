import type { Metadata } from 'next';
import Link from 'next/link';
import { appTimezone } from '@/lib/env';
import { dailySeries, heatLevel, isOverdue, isTracked, minutesByDay, taskStats, targetMinutesFor } from '@/lib/metrics';
import { listProfiles, listTasks, listTeams } from '@/lib/queries';
import { loadTeamSnapshot } from '@/lib/team-data';
import { addDays, formatDateKey, formatDateTime, formatMinutes, rangeKeys } from '@/lib/time';
import { Avatar, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader, Stat } from '@/components/ui';
import { PeopleTable } from '@/components/work/PeopleTable';
import { TaskList } from '@/components/work/TaskList';
import { CommitList } from '@/components/work/CommitList';
import { HoursChart } from '@/components/charts/HoursChart';
import { PeopleHoursChart } from '@/components/charts/PeopleHoursChart';
import { CountChart } from '@/components/charts/CountChart';
import { AttendanceHeatmap } from '@/components/charts/Heatmap';
import { TaskBreakdown } from '@/components/charts/TaskBreakdown';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'Dashboard' };

const HEATMAP_DAYS = 28;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team: teamFilter } = await searchParams;
  const tz = appTimezone();
  const now = new Date();

  const [teams, allPeople, allTasks] = await Promise.all([listTeams(), listProfiles({ activeOnly: true }), listTasks()]);
  const tracked = allPeople.filter(isTracked);
  const people = teamFilter ? tracked.filter((p) => p.team_id === teamFilter) : tracked;
  const ids = new Set(people.map((p) => p.id));
  const tasks = allTasks.filter((t) => (t.assignee_id ? ids.has(t.assignee_id) : !teamFilter || t.team_id === teamFilter));
  const openTasks = tasks.filter((t) => t.status !== 'done');

  const snapshot = await loadTeamSnapshot(people, tz, { historyDays: HEATMAP_DAYS, commitDays: 14, tasks: openTasks });
  const { today, rows } = snapshot;
  const peopleMap = new Map(allPeople.map((p) => [p.id, p]));

  // Headline numbers.
  const workingNow = rows.filter((r) => r.workingSince).length;
  const hoursToday = rows.reduce((n, r) => n + r.todayMinutes, 0);
  const weekMinutes = rows.reduce((n, r) => n + r.weekMinutes, 0);
  const weekTarget = rows.reduce((n, r) => n + r.weekTarget, 0);
  const expectedToday = people.filter((p) => targetMinutesFor(p, today) > 0);
  const updatesToday = expectedToday.filter((p) => rows.find((r) => r.id === p.id)?.updateToday).length;
  const stats = taskStats(tasks, today);
  const commits7d = rows.reduce((n, r) => n + r.commits7d, 0);

  // Team hours per day, last 14 days.
  const trendStart = addDays(today, -13);
  const trend = rangeKeys(trendStart, today).map((date) => ({ date, minutes: 0, target: 0 }));
  for (const p of people) {
    const series = dailySeries(
      snapshot.sessions.filter((s) => s.user_id === p.id),
      p,
      trendStart,
      today,
      tz,
      now
    );
    series.forEach((pt, i) => {
      trend[i]!.minutes += pt.minutes;
      trend[i]!.target += pt.target;
    });
  }
  const trendData = trend.map((p) => ({
    label: formatDateKey(p.date),
    hours: Math.round((p.minutes / 60) * 10) / 10,
    target: Math.round((p.target / 60) * 10) / 10
  }));

  // Heatmap, last 28 days.
  const heatDays = rangeKeys(addDays(today, -(HEATMAP_DAYS - 1)), today);
  const heatRows = people.map((p) => {
    const byDay = minutesByDay(
      snapshot.sessions.filter((s) => s.user_id === p.id),
      tz,
      now
    );
    return {
      id: p.id,
      name: p.full_name,
      cells: heatDays.map((date) => {
        const minutes = Math.round(byDay.get(date) ?? 0);
        const target = targetMinutesFor(p, date);
        return { date, minutes, target, level: heatLevel(minutes, target) };
      })
    };
  });

  const personHours = rows.map((r) => ({
    name: r.name.split(' ')[0] ?? r.name,
    hours: Math.round((r.weekMinutes / 60) * 10) / 10,
    target: Math.round((r.weekTarget / 60) * 10) / 10
  }));

  const inReview = tasks.filter((t) => t.status === 'review');
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const todaysUpdates = snapshot.updates.filter((u) => u.work_date === today);
  const missingUpdates = expectedToday.filter((p) => !todaysUpdates.some((u) => u.user_id === p.id));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatDateKey(today, { weekday: 'long', day: 'numeric', month: 'long' })} · live view of attendance, updates, tasks and commits`}
        actions={
          <>
            <LiveRefresh tables={['attendance_sessions', 'daily_updates', 'tasks', 'commits']} intervalMs={45_000} />
            <ButtonLink href="/admin/tasks/new" size="sm">
              New task
            </ButtonLink>
          </>
        }
      />

      {teams.length > 0 ? (
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="Filter by team">
          <Link
            href="/admin"
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${!teamFilter ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-white text-ink-muted ring-line hover:text-ink'}`}
          >
            Everyone
          </Link>
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/admin?team=${t.id}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${teamFilter === t.id ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-white text-ink-muted ring-line hover:text-ink'}`}
            >
              {t.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {people.length === 0 ? (
        <Card>
          <EmptyState
            title="No active people yet"
            description="Add your interns and employees to start tracking attendance and work."
            action={<ButtonLink href="/admin/people/new">Add a person</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Working now" value={`${workingNow} / ${people.length}`} hint={`${formatMinutes(hoursToday)} logged today`} tone={workingNow > 0 ? 'good' : 'default'} />
            <Stat
              label="Hours this week"
              value={formatMinutes(weekMinutes)}
              hint={weekTarget > 0 ? `${Math.round((weekMinutes / weekTarget) * 100)}% of ${formatMinutes(weekTarget)} target` : 'No targets set'}
            />
            <Stat
              label="Updates today"
              value={`${updatesToday} / ${expectedToday.length}`}
              hint={missingUpdates.length > 0 ? `Waiting on ${missingUpdates.length}` : 'Everyone has posted'}
              tone={missingUpdates.length > 0 ? 'default' : 'good'}
            />
            <Stat
              label="Tasks"
              value={`${stats.todo + stats.in_progress + stats.review} open`}
              hint={`${stats.review} in review · ${stats.overdue} overdue · ${commits7d} commits in 7 days`}
              tone={stats.overdue > 0 ? 'warn' : 'default'}
            />
          </div>

          <Card>
            <CardHeader title="People" description="Live status. Click a name for their full history." />
            <PeopleTable rows={rows} tz={tz} linkBase="/admin/people" />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Team hours per day" description="Last 14 days, all selected people combined" />
              <CardBody>
                <HoursChart data={trendData} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Hours this week by person" description="Worked against target" />
              <CardBody>
                <PeopleHoursChart data={personHours} />
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Attendance" description={`Last ${HEATMAP_DAYS} days. Hover a square for hours worked.`} />
            <CardBody>
              <AttendanceHeatmap rows={heatRows} days={heatDays} />
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Commits per day" description="Last 14 days, by person" />
              <CardBody>
                {snapshot.commitKeys.length > 0 ? (
                  <CountChart data={snapshot.commitChart} keys={snapshot.commitKeys} label="Commits per day by person" />
                ) : (
                  <EmptyState
                    title="No commits yet"
                    description="Add repositories and GitHub usernames to start tracking commits."
                    action={
                      <ButtonLink href="/admin/repos" variant="secondary" size="sm">
                        Set up repositories
                      </ButtonLink>
                    }
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Latest commits" action={<ButtonLink href="/admin/repos" variant="ghost" size="sm">Repositories</ButtonLink>} />
              <CommitList commits={snapshot.commits} people={peopleMap} limit={8} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Tasks by status" />
              <CardBody>
                <TaskBreakdown stats={stats} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Waiting for your review" description={`${inReview.length} ${inReview.length === 1 ? 'task' : 'tasks'}`} />
              <TaskList tasks={inReview} today={today} people={peopleMap} emptyTitle="Nothing to review" />
            </Card>
            <Card>
              <CardHeader title="Overdue" description={`${overdue.length} ${overdue.length === 1 ? 'task' : 'tasks'}`} />
              <TaskList tasks={overdue} today={today} people={peopleMap} emptyTitle="Nothing overdue" />
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Today's updates"
              description={missingUpdates.length > 0 ? `Not yet posted: ${missingUpdates.map((p) => p.full_name.split(' ')[0]).join(', ')}` : 'Everyone expected today has posted'}
            />
            {todaysUpdates.length === 0 ? (
              <EmptyState title="No updates yet today" />
            ) : (
              <ul className="divide-y divide-line">
                {todaysUpdates.map((u) => {
                  const p = peopleMap.get(u.user_id);
                  return (
                    <li key={u.id} className="flex gap-3 px-5 py-4">
                      <Avatar name={p?.full_name ?? '?'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <Link href={`/admin/people/${u.user_id}`} className="font-medium text-ink hover:underline">
                            {p?.full_name}
                          </Link>
                          <span className="text-ink-muted"> · {formatDateTime(u.updated_at, tz)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{u.done}</p>
                        {u.next_steps ? <p className="mt-1.5 text-xs text-ink-muted">Next: {u.next_steps}</p> : null}
                        {u.blockers ? <p className="mt-1 text-xs font-medium text-amber-800">Blocked: {u.blockers}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
